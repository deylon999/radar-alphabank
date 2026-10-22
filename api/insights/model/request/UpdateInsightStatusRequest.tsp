import "../response/InsightEnums.tsp";

namespace AlfaHackathonApi.Insights;

const markReadRequestExample: UpdateInsightStatusRequest = #{ status: "read" };
const dismissRequestExample: UpdateInsightStatusRequest = #{ status: "dismissed" };

@doc("Новое личное состояние вывода.")
@example(markReadRequestExample)
@example(dismissRequestExample)
model UpdateInsightStatusRequest {
    @doc("Состояние для текущего пользователя.")
    status: InsightStatus;
}
