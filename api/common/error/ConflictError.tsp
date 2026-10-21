import "./ProblemResponse.tsp";

namespace AlfaHackathonApi.Errors;

const conflictExample: ConflictError = #{
    statusCode: 409,
    contentType: "application/problem+json",
    cache_control: "no-store",
    body: #{
        type: "/problems/invalid-security-state",
        title: "Invalid security state",
        status: 409,
        detail: "The operation cannot be performed in the current security state."
    }
};

const conflictOperationExample = #{ returnType: conflictExample };

@error
@doc("Ошибка: операция несовместима с текущим состоянием.")
model ConflictError<TBody = ProblemDetails<409>> is ProblemResponse<409, TBody>;
