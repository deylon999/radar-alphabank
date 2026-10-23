from radar_ml.schemas import CompanyContext, UserFact


def _cands(cid, ctx=None, position=None):
    from radar_ml.pipeline import candidates_for

    _, cands = candidates_for(cid, ctx, position)
    return cands


def _by_title(cands, news, needle):
    for c in cands:
        if needle in news.get(c.event_id).title:
            return c
    return None


def test_rate_decision_is_direct_urgent_risk_for_borrower(news):
    cands = _cands("U_T1")
    c = _by_title(cands, news, "ключевую ставку")
    assert c is not None
    assert c.relevance == "direct" and c.urgency == "urgent" and c.kind_prior == "risk"
    assert c.topic == "financing"
    assert cands[0].event_id == c.event_id
    assert any(ln.label == "Ключевая ставка" for ln in c.links)


def test_region_matters_other_region_is_not_direct(news):
    cands = _cands("U_T1")
    irk = _by_title(cands, news, "Иркутской")
    kras = _by_title(cands, news, "Краснодарском")
    assert irk is not None and irk.relevance == "direct"
    assert any(ln.kind == "region" for ln in irk.links)
    assert kras is None or kras.relevance == "possible"


def test_discussed_is_possible_and_noise_skipped(news):
    cands = _cands("U_T3")
    tax = _by_title(cands, news, "НДС")
    assert tax is None or tax.relevance == "possible"
    assert _by_title(cands, news, "монета") is None


def test_steel_price_up_is_risk_for_buyer_and_opportunity_for_seller(news):
    buyer = _by_title(_cands("U_T1"), news, "арматуру")
    seller = _by_title(_cands("U_T2"), news, "арматуру")
    assert buyer is not None and buyer.kind_prior == "risk"
    assert seller is not None and seller.kind_prior == "opportunity"


def test_feeds_differ_between_companies(news):
    a = [c.event_id for c in _cands("U_T1")[:5]]
    b = [c.event_id for c in _cands("U_T3")[:5]]
    assert a != b
    grain = _by_title(_cands("U_T3"), news, "пшениц")
    assert grain is not None and grain.relevance == "direct"


def test_confirmed_fact_site_creates_link(news):
    ctx = CompanyContext(
        company_id="U_T4",
        facts=[
            UserFact(id="s1", category="site", statement="Распределительный склад в Краснодарском крае"),
        ],
    )
    c = _by_title(_cands("U_T4", ctx), news, "Краснодарском")
    assert c is not None
    assert any(ln.kind == "fact" and ln.fact_id == "s1" for ln in c.links)


def test_role_changes_order_not_content(news):
    cfo = _cands("U_T1", position="cfo")
    acc = _cands("U_T1", position="accountant")
    assert {c.event_id for c in cfo} == {c.event_id for c in acc}
