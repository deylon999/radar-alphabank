namespace AlfaHackathonApi.Insights;

const digestResponseExample: DigestResponse = #{
    since: utcDateTime.fromISO("2026-10-14T10:00:00Z"),
    urgentRisks: 1,
    risks: 6,
    opportunities: 4
};

@doc("""
    Сводка по вкладке «Главное» за последние 7 суток для текущего пользователя.
    Учитываются выводы с прямой связью, обновлённые не раньше since и не скрытые этим пользователем.
    """)
@example(digestResponseExample)
model DigestResponse {
    @doc("Начало периода: момент запроса минус 7 суток.")
    since: utcDateTime;

    @doc("Срочные риски. Входят и в risks.")
    @minValue(0)
    urgentRisks: int32;

    @doc("Все риски за период, включая срочные. Совпадает с лентой при фильтре «Риски».")
    @minValue(0)
    risks: int32;

    @doc("Возможности за период.")
    @minValue(0)
    opportunities: int32;
}
