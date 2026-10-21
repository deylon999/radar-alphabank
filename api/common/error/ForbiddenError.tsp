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
    cacheControl: "no-store",
    body: #{
        type: "/problems/invalid-csrf-token",
        title: "Неверный CSRF-токен",
        status: 403,
        detail: "Получите CSRF-токен для текущей сессии и повторите запрос."
    }
};

const reauthenticationRequiredExample: ForbiddenError<ReauthenticationRequiredDetails> = #{
    statusCode: 403,
    contentType: "application/problem+json",
    cacheControl: "no-store",
    body: #{
        type: "/problems/reauthentication-required",
        title: "Нужно подтвердить личность",
        status: 403,
        detail: "Перед этой операцией подтвердите личность."
    }
};

const invalidCsrfOperationExample = #{ returnType: invalidCsrfExample };
const reauthenticationRequiredOperationExample = #{ returnType: reauthenticationRequiredExample };

@error
@doc("Ошибка: запрос не прошёл дополнительную проверку безопасности.")
model ForbiddenError<TBody = ProblemDetails<403>> is ProblemResponse<403, TBody>;
