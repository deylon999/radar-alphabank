import "./MembershipResponse.tsp";
import "../../../auth/model/response/AuthenticatedUserResponse.tsp";
import "../../../join-requests/model/response/JoinRequestResponse.tsp";

using AlfaHackathonApi.Auth;
using AlfaHackathonApi.JoinRequests;

namespace AlfaHackathonApi.Me;

const memberMeExample: MeResponse = #{
    user: authenticatedUserExample,
    membership: ownerMembershipExample,
    joinRequest: null
};

const pendingMeExample: MeResponse = #{
    user: #{ ...authenticatedUserExample, id: "c3e1f7a2-4b6d-4e8f-a0c9-5d2b7e1f3a64", email: "maria@example.com" },
    membership: null,
    joinRequest: pendingJoinRequestExample
};

const withoutCompanyMeExample: MeResponse = #{
    user: #{ ...authenticatedUserExample, id: "c3e1f7a2-4b6d-4e8f-a0c9-5d2b7e1f3a64", email: "maria@example.com" },
    membership: null,
    joinRequest: null
};

@doc("""
    Текущий пользователь и его отношение к компании. Возможные состояния:
    участник (membership есть), ожидает решения или получил отказ (joinRequest есть), без компании (оба null).
    """)
@example(memberMeExample)
@example(pendingMeExample)
model MeResponse {
    @doc("Пользователь текущей сессии.")
    user: AuthenticatedUserResponse;

    @doc("Членство в компании; null, если пользователь ни в какой компании не состоит.")
    membership: MembershipResponse | null;

    @doc("""
        Заявка, которую нужно показать пользователю: ожидающая решения, либо отклонённая,
        если после неё пользователь не вступал в компанию. Иначе null, в том числе всегда при наличии членства.
        Отменённые заявки не показываются.
        """)
    joinRequest: JoinRequestResponse | null;
}
