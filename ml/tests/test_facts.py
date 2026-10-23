import io
import json

from radar_ml.facts.extract import SourceText, document_text, extract_facts

DESCRIPTION = (
    "Мы строим дороги в Иркутской области по госконтрактам. "
    "Экскаваторы закупаем в Китае с оплатой в юанях. "
    "Основной кредит у нас с плавающей ставкой. "
    "Склад техники находится в Иркутске, склад в Братске не пострадал от паводка."
)


def test_rule_extraction_categories_and_negation(env):
    res = extract_facts([SourceText("text", "Описание компании", DESCRIPTION)], existing=[])
    cats = [f["category"] for f in res["facts"]]
    assert {"supplier", "finance", "site"} <= set(cats)
    neg = [f for f in res["facts"] if "не пострадал" in f["statement"]]
    assert neg and neg[0]["negated"]
    assert all(f["evidence"] for f in res["facts"])
    assert res["method"] == "rules"


def test_existing_facts_not_duplicated(env):
    first = extract_facts([SourceText("text", "Описание компании", DESCRIPTION)], existing=[])
    statements = [f["statement"] for f in first["facts"]]
    again = extract_facts([SourceText("text", "Описание компании", DESCRIPTION)], existing=statements)
    assert again["facts"] == []


def test_link_takes_only_statements_about_company(env):
    page = "Наш поставщик ООО Альфа имеет 40 складов по всей России. Мы закупаем у них битум для дорог."
    res = extract_facts([SourceText("link", "example.com", page)], existing=[])
    st = " ".join(f["statement"] for f in res["facts"])
    assert "битум" in st
    assert "40 складов" not in st


def test_llm_facts_with_fake_evidence_are_rejected(gw):
    gw.register_stub(
        "facts_extract",
        lambda t, m: json.dumps(
            {
                "facts": [
                    {
                        "category": "site",
                        "statement": "Завод в Казани",
                        "evidence": "У нас завод в Казани",
                        "negated": False,
                        "sourceIndex": 0,
                    }
                ],
                "unknownFields": [],
            },
            ensure_ascii=False,
        ),
    )
    res = extract_facts([SourceText("text", "Описание компании", DESCRIPTION)], existing=[])
    assert res["method"] == "rules"  # выдуманное основание не прошло проверку, сработали правила
    assert all("Казан" not in f["statement"] for f in res["facts"])


def test_llm_facts_accepted_when_grounded(gw):
    gw.register_stub(
        "facts_extract",
        lambda t, m: json.dumps(
            {
                "facts": [
                    {
                        "category": "supplier",
                        "statement": "Экскаваторы закупаются в Китае за юани",
                        "evidence": "Экскаваторы закупаем в Китае с оплатой в юанях",
                        "negated": False,
                        "sourceIndex": 0,
                    }
                ],
                "unknownFields": ["условия кредита"],
            },
            ensure_ascii=False,
        ),
    )
    res = extract_facts([SourceText("text", "Описание компании", DESCRIPTION)], existing=[])
    assert res["method"] == "llm"
    assert res["facts"][0]["source"] == {"kind": "text", "label": "Описание компании"}
    assert res["unknownFields"] == ["условия кредита"]


def test_document_text_formats():
    import docx

    d = docx.Document()
    d.add_paragraph("Мы закупаем металлопрокат у поставщиков из Челябинска.")
    buf = io.BytesIO()
    d.save(buf)
    st = document_text("Справка.docx", buf.getvalue())
    assert "металлопрокат" in st.text and st.kind == "document"
    assert "склад" in document_text("a.txt", "Склад в Москве".encode("cp1251")).text.lower()
