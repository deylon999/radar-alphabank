from radar_ml.news.extract import detect_stage, rule_extract


def test_snapshot_dedup_noise_and_stage(news):
    evs = news.list(relevant_only=False)
    rate = [e for e in evs if "ключев" in e.title.lower()]
    assert len(rate) == 1, "перепечатка решения ЦБ должна склеиться с первоисточником"
    assert len(rate[0].sources) == 2
    assert rate[0].stage == "decided"
    assert rate[0].official
    assert rate[0].directions.get("key_rate") == "hold"
    coin = next(e for e in evs if "монета" in e.title.lower())
    assert not coin.business_relevant
    tax = next(e for e in evs if "НДС" in e.title)
    assert tax.stage == "discussed"


def test_negation_and_regions_preserved():
    r = rule_extract(
        "Паводок в Краснодарском крае ограничил движение грузовиков",
        "В Краснодарском крае из-за паводка ограничено движение грузовиков на трассе. Склад местной компании не пострадал.",
    )
    assert r.entities.regions == ["Краснодарский край"]
    assert "road_logistics" in r.factors
    assert any("не пострадал" in c.text for c in r.claims)


def test_stage_detection():
    assert detect_stage("минфин предложил повысить ндс", "") == "discussed"
    assert detect_stage("правительство утвердило пошлины", "") == "decided"
    assert detect_stage("какое решение примет цб", "") == "discussed"
    assert detect_stage("продажи автомобилей выросли", "по данным автостата продажи выросли.") == "occurred"
    assert detect_stage("рф может поднять пошлину на ввоз пива", "") == "discussed"


def test_ingest_text_and_reprint(env):
    from radar_ml.news.service import get_news

    n = get_news()
    ev, change = n.ingest_text(
        "Цены на бензин на бирже выросли до рекорда", "Биржевые цены на бензин АИ-92 выросли до рекорда."
    )
    assert change == "new"
    assert "fuel" in ev.entities.factors
    _, change2 = n.ingest_text(
        "Цены на бензин на бирже выросли до рекорда", "Биржевые цены на бензин АИ-92 выросли до рекорда."
    )
    assert change2 == "reprint"


def test_bm25_search_finds_related(news):
    hits = news.search("ключевая ставка решение", k=3)
    assert hits and "ставк" in hits[0][0].title.lower()
