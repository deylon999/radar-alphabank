import "../../../common/model/Uuid.tsp";

using AlfaHackathonApi.Domain;

namespace AlfaHackathonApi.Bots;

const linkResultResponseExample: LinkResultResponse = #{ userId: "b95b680c-67b7-4d2e-bbd3-3b63d4cc7d61" };

@doc("Результат привязки.")
@example(linkResultResponseExample)
model LinkResultResponse {
    @doc("ID пользователя, к которому привязан чат.")
    userId: Uuid;
}
