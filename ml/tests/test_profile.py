from radar_ml.schemas import CompanyContext, UserFact


def test_quality_report_flags_dirty_data(env):
    from radar_ml.data.dataset import get_dataset

    ds = get_dataset()
    q = ds.quality
    assert q["duplicateCompanyIds"] == {"U_T5": 2}
    assert q["payments"]["selfTransfers"] == 1
    assert q["persons"]["missingLocation"] == 1
    # Связь физлица без города сохраняется
    assert ds.linked_companies("U_T1") == ["U_T6"]


def test_dataset_profile_has_explainable_factors(env):
    from radar_ml.data.dataset import get_dataset
    from radar_ml.profile.builder import build_profile

    bp = build_profile("U_T1", None, get_dataset())
    p = bp.profile
    assert p.origin == "dataset"
    assert p.sector_id == "civil_engineering"
    assert p.city == "Иркутск"
    assert set(p.products) >= {"loan", "leasing", "guarantee"}
    fw = bp.factor_weights
    assert fw["key_rate"] >= 0.9
    assert fw["state_spending"] >= 0.9
    assert fw["fx_cny"] >= 0.8  # Китай в данных ФТС
    # Оценка положения в отрасли — по клиентской базе банка
    assert p.industry_position.rank == 1 and p.industry_position.peers == 2
    assert round(p.industry_position.share_pct) == 80
    # Поставщик-металлург с 40% платежей даёт фактор металлов через контрагента
    metals = next(f for f in p.factors if f.id == "metals")
    assert any(o.origin == "counterparty" for o in metals.origins)
    assert "cp:U_T2" in bp.signals.items
    # Перевод самому себе не считается контрагентом
    assert all(c.id != "U_T1" for c in p.counterparties)


def test_ambiguous_and_missing_data_are_marked(env):
    from radar_ml.data.dataset import get_dataset
    from radar_ml.profile.builder import build_profile

    p = build_profile("U_T5", None, get_dataset()).profile
    assert any("несколько разных записей" in q for q in p.data_quality)
    assert any("ФТС" in q for q in p.data_quality)


def test_confirmed_facts_add_factors_but_pending_do_not(env):
    from radar_ml.data.dataset import get_dataset
    from radar_ml.profile.builder import build_profile

    ctx = CompanyContext(
        company_id="U_T4",
        facts=[
            UserFact(
                id="f1",
                category="supplier",
                statement="Закупаем бытовую технику в Китае с оплатой в юанях",
                status="confirmed",
            ),
            UserFact(id="f2", category="logistics", statement="Склад в Новосибирске", status="pending"),
        ],
    )
    bp = build_profile("U_T4", ctx, get_dataset())
    assert bp.factor_weights["fx_cny"] >= 0.8
    assert "fact:f1" in bp.signals.items
    assert "fact:f2" not in bp.signals.items


def test_user_company_profile_from_description(env):
    from radar_ml.data.dataset import get_dataset
    from radar_ml.profile.builder import build_profile

    ctx = CompanyContext(
        company_id="new-1",
        name="ООО Ромашка",
        description="Мы застройщик жилых комплексов в Новосибирске",
        facts=[
            UserFact(id="f9", category="finance", statement="Проектное финансирование с плавающей ставкой")
        ],
    )
    p = build_profile("new-1", ctx, get_dataset()).profile
    assert p.origin == "user"
    assert p.sector_id == "housing_construction"
    assert p.region == "Новосибирская область"
    assert any(f.id == "key_rate" for f in p.factors)
