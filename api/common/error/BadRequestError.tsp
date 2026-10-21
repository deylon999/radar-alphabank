import "./ProblemResponse.tsp";

namespace AlfaHackathonApi.Errors;

const badRequestExample: BadRequestError = #{
    statusCode: 400,
    contentType: "application/problem+json",
    cacheControl: "no-store",
    body: #{
        type: "/problems/malformed-request",
        title: "Malformed request",
        status: 400,
        detail: "The request contains invalid JSON or an invalid parameter."
    }
};

const badRequestOperationExample = #{ returnType: badRequestExample };

@error
@doc("Ошибка: некорректный JSON или параметр запроса.")
@example(badRequestExample)
model BadRequestError<TBody = ProblemDetails<400>> is ProblemResponse<400, TBody>;
