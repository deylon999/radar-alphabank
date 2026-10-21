import "../../../common/error/NotFoundError.tsp";
import "../../../common/error/ConflictError.tsp";

using AlfaHackathonApi.Errors;

namespace AlfaHackathonApi.Members.Errors;

@doc("Пользователь не состоит в этой компании.")
model MemberNotFoundDetails {
    ...OmitProperties<ProblemDetails<404>, "type">;
    type: "/problems/member-not-found";
}

@doc("Владелец не может выйти из компании или быть исключён. Сначала он передаёт права другому участнику.")
model OwnerCannotLeaveDetails {
    ...OmitProperties<ProblemDetails<409>, "type">;
    type: "/problems/owner-cannot-leave";
}

const memberNotFoundExample: NotFoundError<MemberNotFoundDetails> = #{
    statusCode: 404,
    contentType: "application/problem+json",
    cacheControl: "no-store",
    body: #{
        type: "/problems/member-not-found",
        title: "Участник не найден",
        status: 404,
        detail: "Пользователь не состоит в этой компании."
    }
};

const memberNotFoundOperationExample = #{ returnType: memberNotFoundExample };

const ownerCannotLeaveExample: ConflictError<OwnerCannotLeaveDetails> = #{
    statusCode: 409,
    contentType: "application/problem+json",
    cacheControl: "no-store",
    body: #{
        type: "/problems/owner-cannot-leave",
        title: "Владелец не может выйти",
        status: 409,
        detail: "Сначала передайте права владельца другому участнику."
    }
};

const ownerCannotLeaveOperationExample = #{ returnType: ownerCannotLeaveExample };
