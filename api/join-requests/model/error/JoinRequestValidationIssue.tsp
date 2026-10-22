import "../../../common/error/ValidationError.tsp";

using AlfaHackathonApi.Errors;

namespace AlfaHackathonApi.JoinRequests.Errors;

const joinRequestValidationExample: ValidationError<JoinRequestValidationIssue> = #{
    statusCode: 422,
    contentType: "application/problem+json",
    cacheControl: "no-store",
    body: #{
        type: "/problems/validation-failed",
        title: "Ошибка валидации",
        status: 422,
        detail: "Сообщение должно быть длиной от 1 до 500 символов.",
        errors: #[
            #{
                field: "message",
                title: "OUT_OF_RANGE",
                description: "Сообщение должно быть длиной от 1 до 500 символов."
            }
        ]
    }
};

const joinRequestValidationOperationExample = #{ returnType: joinRequestValidationExample };

@doc("Ошибки полей заявки на вступление.")
@example(#{ field: "position", title: "INVALID_ENUM_VALUE", description: "Выберите должность из списка." })
union JoinRequestValidationIssue {
    position: {
        field: "position";
        title: "INVALID_TYPE" | "INVALID_ENUM_VALUE";
        description: string;
    },

    message: {
        field: "message";
        title: "INVALID_TYPE" | "MUST_NOT_BE_EMPTY" | "OUT_OF_RANGE";
        description: string;
    },
}
