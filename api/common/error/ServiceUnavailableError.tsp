import "./ProblemResponse.tsp";

namespace AlfaHackathonApi.Errors;

@doc("Модель недоступна, исчерпан лимит её использования или обработка не уложилась в отведённое время.")
model AiUnavailableDetails {
    ...OmitProperties<ProblemDetails<503>, "type">;
    type: "/problems/ai-unavailable";
}

const aiUnavailableExample: ServiceUnavailableError<AiUnavailableDetails> = #{
    statusCode: 503,
    contentType: "application/problem+json",
    cacheControl: "no-store",
    body: #{
        type: "/problems/ai-unavailable",
        title: "Сервис анализа недоступен",
        status: 503,
        detail: "Не удалось обработать материалы. Попробуйте позже."
    }
};

const aiUnavailableOperationExample = #{ returnType: aiUnavailableExample };

@error
@doc("Ошибка: сервис временно не может выполнить запрос.")
model ServiceUnavailableError<TBody = ProblemDetails<503>> is ProblemResponse<503, TBody>;
