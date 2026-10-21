import "./ProblemResponse.tsp";

namespace AlfaHackathonApi.Errors;

const conflictExample: ConflictError = #{
    statusCode: 409,
    contentType: "application/problem+json",
    cacheControl: "no-store",
    body: #{
        type: "/problems/invalid-security-state",
        title: "Операция недоступна",
        status: 409,
        detail: "Операцию нельзя выполнить в текущем состоянии входа."
    }
};

const conflictOperationExample = #{ returnType: conflictExample };

@error
@doc("Ошибка: операция несовместима с текущим состоянием.")
model ConflictError<TBody = ProblemDetails<409>> is ProblemResponse<409, TBody>;
