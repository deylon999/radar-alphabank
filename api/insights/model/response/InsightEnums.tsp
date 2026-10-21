namespace AlfaHackathonApi.Insights;

@doc("Вид вывода: risk — риск, opportunity — возможность.")
union InsightKind {
    "risk",
    "opportunity",
}

@doc("Срочность: urgent — срочно, important — важно, info — к сведению.")
union Urgency {
    "urgent",
    "important",
    "info",
}

@doc("Стадия события: occurred — произошло, discussed — обсуждается, decided — решение принято, resolved — ситуация разрешилась.")
union EventStage {
    "occurred",
    "discussed",
    "decided",
    "resolved",
}

@doc("Связь события с компанией: direct — прямая (вкладка «Главное»), possible — возможная (вкладка «Под наблюдением»).")
union Relevance {
    "direct",
    "possible",
}

@doc("""
    Состояние вывода для текущего пользователя, у каждого участника своё.
    new — не открыт или существенно обновился после прочтения; read — прочитан;
    dismissed — скрыт, не попадает в ленту, сводку и обзор и остаётся скрытым после обновлений.
    """)
union InsightStatus {
    "new",
    "read",
    "dismissed",
}

@doc("Тема вывода, по ней строится разрез обзора. У вывода одна тема.")
union Topic {
    "financing",
    "currency",
    "costs",
    "demand",
    "regulation",
    "logistics",
}

@doc("Роль шага в цепочке влияния: event — событие, place — место, asset — площадка, supply — поставка, counterparty — контрагент, market — рынок, company — сама компания.")
union ImpactRole {
    "event",
    "place",
    "asset",
    "supply",
    "counterparty",
    "market",
    "company",
}
