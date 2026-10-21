import "./ProblemResponse.tsp";
import "./ValidationIssue.tsp";

namespace AlfaHackathonApi.Errors;

@error
@doc("Ошибка валидации полей запроса.")
model ValidationError<TIssue extends ValidationIssue> is
    ProblemResponse<
        422,
        {
            ...OmitProperties<ProblemDetails<422>, "type">;
            type: "/problems/validation-failed";

            @doc("Ошибки полей.")
            @minItems(1)
            errors: TIssue[];
        }
    >;
