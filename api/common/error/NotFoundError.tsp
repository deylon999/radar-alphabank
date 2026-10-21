import "./ProblemResponse.tsp";

namespace AlfaHackathonApi.Errors;

const notFoundExample: NotFoundError = #{
    statusCode: 404,
    contentType: "application/problem+json",
    cacheControl: "no-store",
    body: #{
        type: "/problems/session-not-found",
        title: "Сессия не найдена",
        status: 404,
        detail: "Среди ваших действующих сессий такой нет."
    }
};

const notFoundOperationExample = #{ returnType: notFoundExample };

@error
@doc("Ошибка: ресурс не найден среди доступных текущему пользователю.")
@example(notFoundExample)
model NotFoundError<TBody = ProblemDetails<404>> is ProblemResponse<404, TBody>;
