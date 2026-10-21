import "./InsightResponse.tsp";

namespace AlfaHackathonApi.Insights;

const insightsPageExample: InsightsResponse = #{
    items: #[keyRateInsightExample],
    nextCursor: "eyJrIjoiOWIxZjNjNWUifQ"
};

const insightsLastPageExample: InsightsResponse = #{
    items: #[keyRateInsightExample],
    nextCursor: null
};

@doc("Страница ленты.")
@example(insightsPageExample)
model InsightsResponse {
    @doc("Выводы страницы. Пустой массив, если подходящих выводов нет.")
    items: InsightResponse[];

    @doc("Курсор следующей страницы; null, если страница последняя. Непрозрачен для клиента.")
    nextCursor: string | null;
}
