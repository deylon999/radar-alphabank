import "@typespec/http";
import "./ProblemResponse.tsp";

using TypeSpec.Http;

namespace AlfaHackathonApi.Errors;

const tooManyRequestsExample: TooManyRequestsError = #{
    statusCode: 429,
    contentType: "application/problem+json",
    cacheControl: "no-store",
    retryAfter: 35,
    body: #{
        type: "/problems/too-many-attempts",
        title: "Too many attempts",
        status: 429,
        detail: "Too many attempts. Wait before trying again."
    }
};

const tooManyRequestsOperationExample = #{ returnType: tooManyRequestsExample };

@error
@doc("Ошибка: временно исчерпан лимит попыток или доступная ёмкость обработки.")
@example(tooManyRequestsExample)
model TooManyRequestsError {
    ...ProblemResponse<429>;

    @doc("Минимальное время ожидания в секундах. Повторная попытка после ожидания не гарантирует вход.")
    @header("Retry-After")
    @minValue(1)
    retryAfter: int32;
}
