import "./ProblemResponse.tsp";

namespace AlfaHackathonApi.Errors;

const badRequestExample: BadRequestError = #{
    statusCode: 400,
    contentType: "application/problem+json",
    cacheControl: "no-store",
    body: #{
        type: "/problems/malformed-request",
        title: "Некорректный запрос",
        status: 400,
        detail: "В запросе некорректный JSON или параметр."
    }
};

const badRequestOperationExample = #{ returnType: badRequestExample };

@error
@doc("Ошибка: некорректный JSON или параметр запроса.")
model BadRequestError<TBody = ProblemDetails<400>> is ProblemResponse<400, TBody>;
