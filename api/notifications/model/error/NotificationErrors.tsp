import "../../../common/error/ConflictError.tsp";
import "../../../common/error/ValidationError.tsp";

using AlfaHackathonApi.Errors;

namespace AlfaHackathonApi.Notifications.Errors;

@doc("Telegram уже привязан. Чтобы привязать другой аккаунт, сначала отключите текущий.")
model TelegramAlreadyConnectedDetails {
    ...OmitProperties<ProblemDetails<409>, "type">;
    type: "/problems/telegram-already-connected";
}

const telegramAlreadyConnectedExample: ConflictError<TelegramAlreadyConnectedDetails> = #{
    statusCode: 409,
    contentType: "application/problem+json",
    cacheControl: "no-store",
    body: #{
        type: "/problems/telegram-already-connected",
        title: "Telegram уже подключён",
        status: 409,
        detail: "Чтобы подключить другой аккаунт, сначала отключите текущий."
    }
};

const telegramAlreadyConnectedOperationExample = #{ returnType: telegramAlreadyConnectedExample };

const notificationSettingsValidationExample: ValidationError<NotificationSettingsValidationIssue> = #{
    statusCode: 422,
    contentType: "application/problem+json",
    cacheControl: "no-store",
    body: #{
        type: "/problems/validation-failed",
        title: "Ошибка валидации",
        status: 422,
        detail: "Укажите часовой пояс из списка IANA, например Europe/Moscow.",
        errors: #[
            #{
                field: "timeZone",
                title: "INVALID_TIME_ZONE",
                description: "Укажите часовой пояс из списка IANA, например Europe/Moscow."
            }
        ]
    }
};

const notificationSettingsValidationOperationExample = #{ returnType: notificationSettingsValidationExample };

@doc("Ошибки полей настроек уведомлений.")
@example(#{ field: "digestTime", title: "MUST_MATCH_PATTERN", description: "Укажите время в формате ЧЧ:ММ." })
union NotificationSettingsValidationIssue {
    urgentKinds: {
        field: "urgentKinds";

        @doc("MUST_BE_UNIQUE — вид указан дважды.")
        title: "REQUIRED" | "MUST_NOT_BE_NULL" | "INVALID_TYPE" | "INVALID_ENUM_VALUE" | "MUST_BE_UNIQUE";

        description: string;
    },

    digest: {
        field: "digest";
        title: "REQUIRED" | "MUST_NOT_BE_NULL" | "INVALID_TYPE" | "INVALID_ENUM_VALUE";
        description: string;
    },

    digestTime: {
        field: "digestTime";
        title: "REQUIRED" | "MUST_NOT_BE_NULL" | "INVALID_TYPE" | "MUST_MATCH_PATTERN";
        description: string;
    },

    timeZone: {
        field: "timeZone";

        @doc("INVALID_TIME_ZONE — пояса нет в базе IANA.")
        title: "REQUIRED" | "MUST_NOT_BE_NULL" | "INVALID_TYPE" | "OUT_OF_RANGE" | "INVALID_TIME_ZONE";

        description: string;
    },
}
