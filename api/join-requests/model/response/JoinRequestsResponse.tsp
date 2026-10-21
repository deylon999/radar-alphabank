import "./JoinRequestResponse.tsp";

namespace AlfaHackathonApi.JoinRequests;

const joinRequestsResponseExample: JoinRequestsResponse = #{
    joinRequests: #[pendingJoinRequestExample]
};

@doc("Заявки компании, ожидающие решения владельца.")
@example(joinRequestsResponseExample)
model JoinRequestsResponse {
    @doc("Заявки в статусе pending, сначала самые старые. Пустой массив, если ждущих решения нет.")
    joinRequests: JoinRequestResponse[];
}
