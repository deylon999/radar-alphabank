import "../../../common/error/ProblemResponse.tsp";
import "../../../common/error/UnauthorizedError.tsp";
import "../../../common/error/NotFoundError.tsp";
import "../../../common/error/ConflictError.tsp";
import "../../../common/error/ValidationError.tsp";

using AlfaHackathonApi.Errors;

namespace AlfaHackathonApi.Bots.Errors;

@doc("Токен бота отсутствует или неверен.")
model InvalidBotTokenDetails {
    ...OmitProperties<ProblemDetails<401>, "type">;
    type: "/problems/invalid-bot-token";
}

@doc("Кода нет или он выдан для другого мессенджера.")
model LinkCodeNotFoundDetails {
    ...OmitProperties<ProblemDetails<404>, "type">;
    type: "/problems/link-code-not-found";
}

@doc("Срок кода истёк.")
model LinkCodeExpiredDetails {
    ...OmitProperties<ProblemDetails<410>, "type">;
    type: "/problems/link-code-expired";
}

@doc("Код уже использован или отменён новой ссылкой.")
model LinkCodeUsedDetails {
    ...OmitProperties<ProblemDetails<409>, "type">;
    type: "/problems/link-code-used";
}

@doc("Чат не привязан ни к одному пользователю.")
model ChatNotLinkedDetails {
    ...OmitProperties<ProblemDetails<404>, "type">;
    type: "/problems/chat-not-linked";
}

@doc("Доставки нет среди доставок этого мессенджера.")
model DeliveryNotFoundDetails {
    ...OmitProperties<ProblemDetails<404>, "type">;
    type: "/problems/delivery-not-found";
}

const invalidBotTokenExample: UnauthorizedError<InvalidBotTokenDetails> = #{
    statusCode: 401,
    contentType: "application/problem+json",
    cacheControl: "no-store",
    body: #{
        type: "/problems/invalid-bot-token",
        title: "Неверный токен бота",
        status: 401,
        detail: "Передайте токен бота в заголовке Authorization."
    }
};

const linkCodeNotFoundExample: NotFoundError<LinkCodeNotFoundDetails> = #{
    statusCode: 404,
    contentType: "application/problem+json",
    cacheControl: "no-store",
    body: #{
        type: "/problems/link-code-not-found",
        title: "Код не найден",
        status: 404,
        detail: "Ссылка не подходит. Откройте её заново на сайте."
    }
};

const linkCodeExpiredExample: ProblemResponse<410, LinkCodeExpiredDetails> = #{
    statusCode: 410,
    contentType: "application/problem+json",
    cacheControl: "no-store",
    body: #{
        type: "/problems/link-code-expired",
        title: "Код устарел",
        status: 410,
        detail: "Ссылка устарела. Получите новую на сайте."
    }
};

const linkCodeUsedExample: ConflictError<LinkCodeUsedDetails> = #{
    statusCode: 409,
    contentType: "application/problem+json",
    cacheControl: "no-store",
    body: #{
        type: "/problems/link-code-used",
        title: "Код уже использован",
        status: 409,
        detail: "Эта ссылка уже использована."
    }
};

const chatNotLinkedExample: NotFoundError<ChatNotLinkedDetails> = #{
    statusCode: 404,
    contentType: "application/problem+json",
    cacheControl: "no-store",
    body: #{
        type: "/problems/chat-not-linked",
        title: "Чат не привязан",
        status: 404,
        detail: "Этот чат не привязан к аккаунту «Радара»."
    }
};

const deliveryNotFoundExample: NotFoundError<DeliveryNotFoundDetails> = #{
    statusCode: 404,
    contentType: "application/problem+json",
    cacheControl: "no-store",
    body: #{
        type: "/problems/delivery-not-found",
        title: "Доставка не найдена",
        status: 404,
        detail: "Такой доставки нет среди доставок этого мессенджера."
    }
};

const botValidationExample: ValidationError<BotValidationIssue> = #{
    statusCode: 422,
    contentType: "application/problem+json",
    cacheControl: "no-store",
    body: #{
        type: "/problems/validation-failed",
        title: "Ошибка валидации",
        status: 422,
        detail: "Код привязки должен состоять из 12 латинских букв и цифр.",
        errors: #[
            #{
                field: "code",
                title: "MUST_MATCH_PATTERN",
                description: "Код привязки должен состоять из 12 латинских букв и цифр."
            }
        ]
    }
};

const invalidBotTokenOperationExample = #{ returnType: invalidBotTokenExample };
const linkCodeNotFoundOperationExample = #{ returnType: linkCodeNotFoundExample };
const linkCodeExpiredOperationExample = #{ returnType: linkCodeExpiredExample };
const linkCodeUsedOperationExample = #{ returnType: linkCodeUsedExample };
const chatNotLinkedOperationExample = #{ returnType: chatNotLinkedExample };
const deliveryNotFoundOperationExample = #{ returnType: deliveryNotFoundExample };
const botValidationOperationExample = #{ returnType: botValidationExample };

@doc("Ошибки полей запросов ботов.")
@example(#{ field: "code", title: "MUST_MATCH_PATTERN", description: "Код привязки должен состоять из 12 латинских букв и цифр." })
union BotValidationIssue {
    code: {
        field: "code";
        title: "REQUIRED" | "MUST_NOT_BE_NULL" | "INVALID_TYPE" | "MUST_MATCH_PATTERN";
        description: string;
    },

    chatId: {
        field: "chatId";
        title: "REQUIRED" | "MUST_NOT_BE_NULL" | "INVALID_TYPE";
        description: string;
    },

    username: {
        field: "username";
        title: "INVALID_TYPE" | "MUST_NOT_BE_EMPTY";
        description: string;
    },

    status: {
        field: "status";
        title: "REQUIRED" | "MUST_NOT_BE_NULL" | "INVALID_TYPE" | "INVALID_ENUM_VALUE";
        description: string;
    },

    error: {
        field: "error";
        title: "INVALID_TYPE" | "MUST_NOT_BE_EMPTY" | "OUT_OF_RANGE";
        description: string;
    },

    limit: {
        field: "limit";
        title: "OUT_OF_RANGE";
        description: string;
    },
}
