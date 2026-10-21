import "./ProblemResponse.tsp";

namespace AlfaHackathonApi.Errors;

@doc("CSRF-токен отсутствует, недействителен или относится к другой сессии.")
model InvalidCsrfDetails {
    ...OmitProperties<ProblemDetails<403>, "type">;
    type: "/problems/invalid-csrf-token";
}

@doc("Для операции нужно повторно подтвердить личность.")
model ReauthenticationRequiredDetails {
    ...OmitProperties<ProblemDetails<403>, "type">;
    type: "/problems/reauthentication-required";
}

const invalidCsrfExample: ForbiddenError<InvalidCsrfDetails> = #{
    statusCode: 403,
    contentType: "application/problem+json",
    cache_control: "no-store",
    body: #{
        type: "/problems/invalid-csrf-token",
        title: "Invalid CSRF token",
        status: 403,
        detail: "Obtain a CSRF token for the current session before submitting the request."
    }
};

const reauthenticationRequiredExample: ForbiddenError<ReauthenticationRequiredDetails> = #{
    statusCode: 403,
    contentType: "application/problem+json",
    cache_control: "no-store",
    body: #{
        type: "/problems/reauthentication-required",
        title: "Reauthentication required",
        status: 403,
        detail: "Confirm your identity before performing this operation."
    }
};

const invalidCsrfOperationExample = #{ returnType: invalidCsrfExample };
const reauthenticationRequiredOperationExample = #{ returnType: reauthenticationRequiredExample };

@error
@doc("Ошибка: запрос не прошёл дополнительную проверку безопасности.")
model ForbiddenError<TBody = ProblemDetails<403>> is ProblemResponse<403, TBody>;
