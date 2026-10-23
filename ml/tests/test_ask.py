import json

from radar_ml.schemas import CompanyContext


def _parse_sse(chunks):
    events = []
    for ch in chunks:
        for block in ch.strip().split("\n\n"):
            if not block or block.startswith(":"):
                continue
            lines = dict(line.split(": ", 1) for line in block.splitlines())
            events.append((lines["event"], json.loads(lines["data"])))
    return events


def _insight(news):
    from radar_ml.pipeline import generate_insight

    ev = next(e for e in news.list() if "ключев" in e.title.lower())
    return generate_insight("U_T1", ev.id, CompanyContext(company_id="U_T1")).dump()


def _ask(question, insight, role=None):
    from radar_ml.agent.ask import AskAgent
    from radar_ml.pipeline import profile_for

    bp = profile_for("U_T1", None)
    return _parse_sse(list(AskAgent().stream(bp, insight, question, role)))


def test_ask_streams_steps_then_answer_without_llm(news, bank, gw):
    ins = _insight(news)
    evs = _ask("Когда банк ждёт снижения ставки?", ins, "cfo")
    kinds = [e for e, _ in evs]
    assert kinds[-1] == "answer" and kinds.count("answer") == 1
    assert "step" in kinds[:-1]
    steps = [d for e, d in evs if e == "step"]
    assert steps[0]["kind"] == "plan"
    ans = evs[-1][1]
    assert "банк" in ans["answer"].lower()
    assert any(c["kind"] == "bank" for c in ans["citations"])


def test_ask_with_model_maps_citations(news, bank, gw):
    ins = _insight(news)

    def answer(task, msgs):
        return json.dumps(
            {
                "offTopic": False,
                "answer": "Банк ожидает сохранения ставки 14,0% до конца 2026 года, поэтому ваш плавающий кредит не подешевеет.",
                "citations": ["BV1", "C1", "S1"],
            },
            ensure_ascii=False,
        )

    gw.register_stub("ask_answer", answer)
    ans = _ask("Что будет с нашим кредитом?", ins)[-1][1]
    kinds = {c["kind"] for c in ans["citations"]}
    assert kinds == {"bank", "client", "news"}


def test_ask_refuses_off_topic_and_other_company(news, gw):
    ins = _insight(news)
    off = _ask("Расскажи анекдот", ins)[-1][1]
    assert off["citations"] == [] and "только" in off["answer"]
    other = _ask("Какие кредиты у компании U_T2?", ins)[-1][1]
    assert other["citations"] == [] and "других компаний" in other["answer"]
