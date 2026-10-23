"""LLM-ветки извлечения новостей и позиций банка: промпты рендерятся, ответы проверяются кодом."""

import json


def test_news_extract_llm_merged_and_validated(gw, env):
    from radar_ml.news.service import get_news

    seen = {}

    def handler(task, msgs):
        seen["prompt"] = msgs[1]["content"]
        return json.dumps(
            {
                "business_relevant": True,
                "topic": "costs",
                "stage": "decided",
                "title": "Металлурги подняли цены на арматуру на 8%",
                "summary": "Крупнейшие металлурги повысили цены на арматуру на 8% с начала октября.",
                "factors": ["metals", "unknown_factor"],
                "directions": {"metals": "up"},
                "regions": [],
                "countries": [],
                "sectors": ["metallurgy"],
                "numbers": [{"value": "8%", "unit": "%", "what": "рост цен", "quote": "на 8%"}],
                "claims": [{"text": "Металлурги повысили цены на 8%", "type": "fact"}],
            },
            ensure_ascii=False,
        )

    calls = []

    def first_bad_then_good(task, msgs):
        calls.append(1)
        if len(calls) == 1:
            return handler(task, msgs)  # неизвестный фактор -> шлюз попросит исправить
        d = json.loads(handler(task, msgs))
        d["factors"] = ["metals"]
        return json.dumps(d, ensure_ascii=False)

    gw.register_stub("news_extract", first_bad_then_good)
    ev, change = get_news().ingest_text(
        "Металлурги повысили цены на арматуру на 8%",
        "Крупнейшие металлурги повысили цены на арматуру и металлопрокат на 8% с начала октября.",
    )
    assert change == "new"
    assert ev.extraction == "llm"
    assert ev.title.startswith("Металлурги подняли")
    assert ev.entities.factors[0] == "metals"
    assert ev.directions["metals"] == "up"
    assert "metallurgy" in ev.entities.sectors
    assert len(calls) == 2
    assert "Справочник факторов" in seen["prompt"] or "Металлурги" in seen["prompt"]


def test_bank_positions_llm_requires_quotes(gw, env):
    from radar_ml.bank.service import get_bank

    page = (
        "Ключевая ставка ЦБ РФ: ставка без изменения на 14,0%. 11 сентября 2026 г. "
        "Мы ожидаем сохранения ключевой ставки на уровне 14,0% до конца 2026 года."
    )

    def handler(task, msgs):
        return json.dumps(
            {
                "positions": [
                    {
                        "indicator": "key_rate",
                        "horizon": "конец 2026 года",
                        "summary": "Банк ждёт ставку 14,0% до конца 2026 года",
                        "quote": "Мы ожидаем сохранения ключевой ставки на уровне 14,0% до конца 2026 года.",
                        "page": 1,
                        "direction": "hold",
                    },
                ]
            },
            ensure_ascii=False,
        )

    gw.register_stub("bank_positions", handler)
    m = get_bank().ingest_pages("rate.pdf", [page], use_llm=True)
    pos = [p for p in get_bank().positions if p.material_id == m.id]
    assert len(pos) == 1 and pos[0].method == "llm" and pos[0].page == 1


def test_bank_positions_with_invented_numbers_fall_back(gw, env):
    from radar_ml.bank.service import get_bank

    page = "Ключевая ставка ЦБ РФ. 11 сентября 2026 г. Мы ожидаем сохранения ключевой ставки на уровне 14,0% до конца 2026 года."
    gw.register_stub(
        "bank_positions",
        lambda t, m: json.dumps(
            {
                "positions": [
                    {
                        "indicator": "key_rate",
                        "summary": "Банк ждёт ставку 11% к концу 2026 года",
                        "quote": "Мы ожидаем сохранения ключевой ставки",
                        "page": 1,
                    }
                ]
            },
            ensure_ascii=False,
        ),
    )
    m = get_bank().ingest_pages("rate2.pdf", [page], use_llm=True)
    pos = [p for p in get_bank().positions if p.material_id == m.id]
    # 11% нет в материале: ответ модели отклонён, позиция взята из текста как есть
    assert pos and all(p.method == "extractive" for p in pos)
    assert "11%" not in pos[0].summary
