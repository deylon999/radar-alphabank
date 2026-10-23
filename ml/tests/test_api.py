import json

from fastapi.testclient import TestClient


def _client():
    from radar_ml.api.app import app

    return TestClient(app)


def test_health_profile_feed_and_ask(env, monkeypatch):
    with _client() as c:
        assert c.get("/healthz").json()["status"] == "ok"
        ready = c.get("/readyz").json()
        assert ready["dataset"] and ready["events"] > 0

        prof = c.post("/v1/companies/U_T1/profile", json={}).json()
        assert prof["profile"]["sectorId"] == "civil_engineering"

        cands = c.post("/v1/companies/U_T1/candidates", json={"position": "cfo"}).json()["items"]
        assert cands and cands[0]["event"]["title"]

        feed = c.post("/v1/companies/U_T1/feed", json={"limit": 3}).json()
        assert feed["analysisStatus"] == "ready"
        assert len(feed["insights"]) == 3
        ins = feed["insights"][0]
        for key in (
            "insightKey",
            "kind",
            "urgency",
            "relevance",
            "topic",
            "title",
            "whyItMatters",
            "event",
            "impactPath",
            "consequence",
            "basis",
            "sources",
            "signals",
            "trace",
            "suggestedQuestions",
        ):
            assert key in ins

        r = c.post(
            "/v1/insights/ask",
            json={"companyId": "U_T1", "insight": ins, "question": "Что это значит для нас?"},
        )
        assert r.headers["content-type"].startswith("text/event-stream")
        blocks = [b for b in r.text.strip().split("\n\n") if b]
        assert blocks[-1].startswith("event: answer")

        tr = c.get(f"/v1/traces/{ins['traceId']}").json()
        assert tr["kind"] == "insight" and tr["entries"]

        assert c.get("/v1/usage").json()["mode"] == "stub"


def test_ingest_new_text_then_generate(env):
    with _client() as c:
        r = c.post(
            "/v1/news/ingest",
            json={
                "title": "Металлурги повысили цены на сталь на 10%",
                "text": "Крупнейшие металлурги повысили цены на сталь и арматуру на 10% с ноября.",
            },
        )
        assert r.status_code == 200
        ev = r.json()["event"]
        assert "metals" in ev["entities"]["factors"]
        g = c.post("/v1/insights/generate", json={"companyId": "U_T1", "eventId": ev["id"]}).json()
        assert g["eventId"] == ev["id"]
        assert g["sources"][0]["url"].startswith("urn:radar:text:")


def test_facts_endpoint_and_validation(env):
    with _client() as c:
        r = c.post(
            "/v1/facts/extract",
            json={
                "companyId": "U_T1",
                "text": "Мы закупаем битум в Китае. Кредит у нас с плавающей ставкой.",
            },
        )
        assert r.status_code == 200 and r.json()["facts"]
        bad = c.post("/v1/facts/extract", json={"companyId": "U_T1"})
        assert bad.status_code == 422 and bad.headers["content-type"].startswith("application/problem+json")


def test_internal_token(env, monkeypatch):
    from radar_ml.settings import get_settings

    monkeypatch.setenv("RADAR_ML_INTERNAL_TOKEN", "s3cret")
    get_settings.cache_clear()
    with _client() as c:
        assert c.get("/readyz").status_code == 401
        assert c.get("/readyz", headers={"X-Internal-Token": "s3cret"}).status_code == 200
        assert c.get("/healthz").status_code == 200


def test_context_company_mismatch(env):
    with _client() as c:
        r = c.post("/v1/companies/U_T1/profile", json={"context": {"companyId": "U_T2"}})
        assert r.status_code == 400
        assert json.loads(r.text)["type"] == "/problems/bad-request"
