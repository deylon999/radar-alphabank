import "../../../common/model/Position.tsp";

using AlfaHackathonApi.Domain;

namespace AlfaHackathonApi.Me;

const updateMembershipRequestExample: UpdateMembershipRequest = #{ position: "cfo" };

@doc("Изменение своего членства. Роль доступа здесь не меняется.")
@example(updateMembershipRequestExample)
model UpdateMembershipRequest {
    @doc("Должность для персонализации ленты.")
    position: Position;
}
