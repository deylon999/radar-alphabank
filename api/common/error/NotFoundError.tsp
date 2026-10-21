import "./ProblemResponse.tsp";

namespace AlfaHackathonApi.Errors;

const notFoundExample: NotFoundError = #{
    statusCode: 404,
    contentType: "application/problem+json",
    cacheControl: "no-store",
    body: #{
        type: "/problems/session-not-found",
        title: "Session not found",
        status: 404,
        detail: "The session was not found among your active sessions."
    }
};

const notFoundOperationExample = #{ returnType: notFoundExample };

@error
@doc("Ошибка: ресурс не найден среди доступных текущему пользователю.")
@example(notFoundExample)
model NotFoundError<TBody = ProblemDetails<404>> is ProblemResponse<404, TBody>;
