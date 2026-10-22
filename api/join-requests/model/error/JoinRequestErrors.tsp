import "../../../common/error/ForbiddenError.tsp";
import "../../../common/error/NotFoundError.tsp";
import "../../../common/error/ConflictError.tsp";

using AlfaHackathonApi.Errors;

namespace AlfaHackathonApi.JoinRequests.Errors;

@doc("Заявки нет среди доступных пользователю заявок этой компании.")
model JoinRequestNotFoundDetails {
    ...OmitProperties<ProblemDetails<404>, "type">;
    type: "/problems/join-request-not-found";
}

@doc("Отменить заявку может только заявитель. Владелец вместо отмены отклоняет заявку.")
model JoinRequestApplicantRequiredDetails {
    ...OmitProperties<ProblemDetails<403>, "type">;
    type: "/problems/join-request-applicant-required";
}

@doc("Заявка уже одобрена, отклонена или отменена.")
model JoinRequestNotPendingDetails {
    ...OmitProperties<ProblemDetails<409>, "type">;
    type: "/problems/join-request-not-pending";
}

const joinRequestNotFoundExample: NotFoundError<JoinRequestNotFoundDetails> = #{
    statusCode: 404,
    contentType: "application/problem+json",
    cacheControl: "no-store",
    body: #{
        type: "/problems/join-request-not-found",
        title: "Заявка не найдена",
        status: 404,
        detail: "Такой заявки нет среди доступных вам."
    }
};

const joinRequestNotFoundOperationExample = #{ returnType: joinRequestNotFoundExample };

const joinRequestApplicantRequiredExample: ForbiddenError<JoinRequestApplicantRequiredDetails> = #{
    statusCode: 403,
    contentType: "application/problem+json",
    cacheControl: "no-store",
    body: #{
        type: "/problems/join-request-applicant-required",
        title: "Отменить может только заявитель",
        status: 403,
        detail: "Чтобы не принимать заявку, отклоните её."
    }
};

const joinRequestApplicantRequiredOperationExample = #{ returnType: joinRequestApplicantRequiredExample };

const joinRequestNotPendingExample: ConflictError<JoinRequestNotPendingDetails> = #{
    statusCode: 409,
    contentType: "application/problem+json",
    cacheControl: "no-store",
    body: #{
        type: "/problems/join-request-not-pending",
        title: "Заявка уже рассмотрена",
        status: 409,
        detail: "Заявка уже одобрена, отклонена или отменена. Обновите данные."
    }
};

const joinRequestNotPendingOperationExample = #{ returnType: joinRequestNotPendingExample };
