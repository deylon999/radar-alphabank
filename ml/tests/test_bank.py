from datetime import UTC, datetime


def test_positions_and_supersedes(bank):
    view, considered = bank.bank_view(["key_rate"], now=datetime(2026, 10, 23, tzinfo=UTC))
    assert view is not None
    assert "14,0%" in view.summary
    assert view.material.id == "policy-rate-2026-09-11"
    assert view.material.page == 1
    assert view.supersedes is not None and "13,5%" in view.supersedes.summary
    assert len(considered) >= 2


def test_no_position_when_no_material(bank):
    view, _ = bank.bank_view(["gold"], now=datetime(2026, 10, 23, tzinfo=UTC))
    assert view is None


def test_outdated_material(bank):
    late = datetime(2027, 9, 1, tzinfo=UTC)
    view, _ = bank.bank_view(["key_rate"], now=late)
    assert view is not None and view.material.outdated


def test_search_returns_page_reference(bank):
    hits = bank.search("прогноз ключевой ставки", now=datetime(2026, 10, 23, tzinfo=UTC))
    assert hits and hits[0]["page"] == 1
    assert hits[0]["materialId"] in {"policy-rate-2026-09-11", "macro-1h26"}


def test_material_from_future_is_ignored(bank):
    early = datetime(2026, 8, 15, tzinfo=UTC)
    view, _ = bank.bank_view(["key_rate"], now=early)
    assert view is not None and view.material.id == "macro-1h26"


def test_pdf_ingestion(env, tmp_path):
    from reportlab.pdfgen import canvas

    from radar_ml.bank.service import get_bank

    p = tmp_path / "test.pdf"
    c = canvas.Canvas(str(p))
    c.drawString(72, 750, "Commodities performance review 15.09.2026")
    c.drawString(72, 730, "We expect Brent at 70 USD by the end of 2026.")
    c.showPage()
    c.save()
    m = get_bank().ingest_pdf(p, use_llm=False)
    assert m.id == "commodities-performance"
    assert m.published_at.date().isoformat() == "2026-09-15"
