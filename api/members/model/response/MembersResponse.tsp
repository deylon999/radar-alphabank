import "./MemberResponse.tsp";

namespace AlfaHackathonApi.Members;

const membersResponseExample: MembersResponse = #{
    members: #[ownerMemberExample, memberExample]
};

@doc("Участники компании.")
@example(membersResponseExample)
model MembersResponse {
    @doc("Первым идёт владелец, он всегда ровно один. Остальные — по времени вступления.")
    @minItems(1)
    members: MemberResponse[];
}
