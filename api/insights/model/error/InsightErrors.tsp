import "../../../common/error/BadRequestError.tsp";
import "../../../common/error/ValidationError.tsp";
import "../../../common/error/NotFoundError.tsp";

using AlfaHackathonApi.Errors;

namespace AlfaHackathonApi.Insights.Errors;

@doc("Курсор не разобран, устарел или получен с другими фильтрами. Ленту нужно запросить с первой страницы.")
model InvalidCursorDetails {
    ...OmitProperties<ProblemDetails<400>, "type">;
    type: "/problems/invalid-cursor";
}

const invalidCursorExample: BadRequestError<InvalidCursorDetails> = #{
    statusCode: 400,
    contentType: "application/problem+json",
    cacheControl: "no-store",
    body: #{
        type: "/problems/invalid-cursor",
        title: "Неверный курсор",
        status: 400,
        detail: "Обновите ленту: курсор не подходит к текущему запросу."
    }
};

const invalidCursorOperationExample = #{ returnType: invalidCursorExample };

const insightsValidationExample: ValidationError<InsightsValidationIssue> = #{
    statusCode: 422,
    contentType: "application/problem+json",
    cacheControl: "no-store",
    body: #{
        type: "/problems/validation-failed",
        title: "Ошибка валидации",
        status: 422,
        detail: "Поисковый запрос должен быть не длиннее 200 символов.",
        errors: #[
            #{
                field: "q",
                title: "OUT_OF_RANGE",
                description: "Поисковый запрос должен быть не длиннее 200 символов."
            }
        ]
    }
};

const insightsValidationOperationExample = #{ returnType: insightsValidationExample };

@doc("Ошибки параметров ленты. Неизвестное значение фильтра — это 400, а не 422.")
@example(#{ field: "q", title: "OUT_OF_RANGE", description: "Поисковый запрос должен быть не длиннее 200 символов." })
union InsightsValidationIssue {
    query: {
        field: "q";
        title: "OUT_OF_RANGE";
        description: string;
    },

    relevance: {
        @doc("relevance передан несколько раз.")
        field: "relevance";

        title: "OUT_OF_RANGE";
        description: string;
    },
}

@doc("Вывода нет среди выводов компании пользователя. Существование чужих выводов не раскрывается.")
model InsightNotFoundDetails {
    ...OmitProperties<ProblemDetails<404>, "type">;
    type: "/problems/insight-not-found";
}

const insightNotFoundExample: NotFoundError<InsightNotFoundDetails> = #{
    statusCode: 404,
    contentType: "application/problem+json",
    cacheControl: "no-store",
    body: #{
        type: "/problems/insight-not-found",
        title: "Вывод не найден",
        status: 404,
        detail: "Такого вывода нет среди доступных вам."
    }
};

const insightNotFoundOperationExample = #{ returnType: insightNotFoundExample };

const insightStatusValidationExample: ValidationError<InsightStatusValidationIssue> = #{
    statusCode: 422,
    contentType: "application/problem+json",
    cacheControl: "no-store",
    body: #{
        type: "/problems/validation-failed",
        title: "Ошибка валидации",
        status: 422,
        detail: "Статус должен быть new, read или dismissed.",
        errors: #[
            #{
                field: "status",
                title: "INVALID_ENUM_VALUE",
                description: "Статус должен быть new, read или dismissed."
            }
        ]
    }
};

const feedbackValidationExample: ValidationError<FeedbackValidationIssue> = #{
    statusCode: 422,
    contentType: "application/problem+json",
    cacheControl: "no-store",
    body: #{
        type: "/problems/validation-failed",
        title: "Ошибка валидации",
        status: 422,
        detail: "Комментарий должен быть длиной от 1 до 2000 символов.",
        errors: #[
            #{
                field: "comment",
                title: "OUT_OF_RANGE",
                description: "Комментарий должен быть длиной от 1 до 2000 символов."
            }
        ]
    }
};

const askValidationExample: ValidationError<AskValidationIssue> = #{
    statusCode: 422,
    contentType: "application/problem+json",
    cacheControl: "no-store",
    body: #{
        type: "/problems/validation-failed",
        title: "Ошибка валидации",
        status: 422,
        detail: "Вопрос должен быть длиной от 1 до 500 символов.",
        errors: #[
            #{
                field: "question",
                title: "OUT_OF_RANGE",
                description: "Вопрос должен быть длиной от 1 до 500 символов."
            }
        ]
    }
};

const insightStatusValidationOperationExample = #{ returnType: insightStatusValidationExample };
const feedbackValidationOperationExample = #{ returnType: feedbackValidationExample };
const askValidationOperationExample = #{ returnType: askValidationExample };

@doc("Ошибки поля при смене личного состояния вывода.")
@example(#{ field: "status", title: "INVALID_ENUM_VALUE", description: "Статус должен быть new, read или dismissed." })
union InsightStatusValidationIssue {
    status: {
        field: "status";
        title: "REQUIRED" | "MUST_NOT_BE_NULL" | "INVALID_TYPE" | "INVALID_ENUM_VALUE";
        description: string;
    },
}

@doc("Ошибки полей оценки вывода.")
@example(#{ field: "useful", title: "REQUIRED", description: "Укажите, полезен ли вывод." })
union FeedbackValidationIssue {
    useful: {
        field: "useful";
        title: "REQUIRED" | "MUST_NOT_BE_NULL" | "INVALID_TYPE";
        description: string;
    },

    comment: {
        field: "comment";
        title: "INVALID_TYPE" | "MUST_NOT_BE_EMPTY" | "OUT_OF_RANGE";
        description: string;
    },
}

@doc("Ошибки поля вопроса.")
@example(#{ field: "question", title: "MUST_NOT_BE_EMPTY", description: "Введите вопрос." })
union AskValidationIssue {
    question: {
        field: "question";
        title: "REQUIRED" | "MUST_NOT_BE_NULL" | "INVALID_TYPE" | "MUST_NOT_BE_EMPTY" | "OUT_OF_RANGE";
        description: string;
    },
}
