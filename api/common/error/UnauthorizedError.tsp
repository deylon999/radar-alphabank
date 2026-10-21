import "./ProblemResponse.tsp";

namespace AlfaHackathonApi.Errors;

const unauthorizedExample: UnauthorizedError = #{
    statusCode: 401,
    contentType: "application/problem+json",
    cacheControl: "no-store",
    body: #{
        type: "/problems/authentication-required",
        title: "Authentication required",
        status: 401,
        detail: "The authenticated session is missing, expired or revoked."
    }
};

const unauthorizedOperationExample = #{ returnType: unauthorizedExample };

@error
@doc("Ошибка: отсутствует действующий вход.")
model UnauthorizedError<TBody = ProblemDetails<401>> is ProblemResponse<401, TBody>;
