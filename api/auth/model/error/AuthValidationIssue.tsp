import "../../../common/error/ValidationError.tsp";

using AlfaHackathonApi.Errors;

namespace AlfaHackathonApi.Auth.Errors;

const credentialsValidationExample: ValidationError<AuthValidationIssue> = #{
    statusCode: 422,
    contentType: "application/problem+json",
    cacheControl: "no-store",
    body: #{
        type: "/problems/validation-failed",
        title: "Validation failed",
        status: 422,
        errors: #[
            #{
                field: "email",
                title: "INVALID_FORMAT",
                description: "Email must be a valid email address."
            }
        ]
    }
};

const passwordValidationExample: ValidationError<AuthValidationIssue> = #{
    ...credentialsValidationExample,
    body: #{
        type: "/problems/validation-failed",
        title: "Validation failed",
        status: 422,
        errors: #[
            #{
                field: "newPassword",
                title: "OUT_OF_RANGE",
                description: "New password must contain between 15 and 255 characters."
            }
        ]
    }
};

const secondFactorValidationExample: ValidationError<AuthValidationIssue> = #{
    ...credentialsValidationExample,
    body: #{
        type: "/problems/validation-failed",
        title: "Validation failed",
        status: 422,
        errors: #[
            #{
                field: "code",
                title: "MUST_MATCH_PATTERN",
                description: "A TOTP code must contain exactly six decimal digits."
            }
        ]
    }
};

const credentialsValidationOperationExample = #{ returnType: credentialsValidationExample };
const passwordValidationOperationExample = #{ returnType: passwordValidationExample };
const secondFactorValidationOperationExample = #{ returnType: secondFactorValidationExample };

const reauthenticationValidationExample: ValidationError<AuthValidationIssue> = #{
    ...credentialsValidationExample,
    body: #{
        type: "/problems/validation-failed",
        title: "Validation failed",
        status: 422,
        errors: #[
            #{
                field: "password",
                title: "REQUIRED",
                description: "The current password is required."
            }
        ]
    }
};

const reauthenticationValidationOperationExample = #{ returnType: reauthenticationValidationExample };

@doc("Ошибки полей запросов безопасности. Неверный по значению пароль или код возвращает 401, а не 422.")
@example(#{ field: "email", title: "INVALID_FORMAT", description: "Email must be a valid email address." })
union AuthValidationIssue {
    email: {
        field: "email";
        title: "REQUIRED" | "MUST_NOT_BE_NULL" | "INVALID_TYPE"
            | "MUST_NOT_BE_EMPTY" | "OUT_OF_RANGE" | "INVALID_FORMAT";
        description: string;
    },

    password: {
        field: "password" | "newPassword";
        title: "REQUIRED" | "MUST_NOT_BE_NULL" | "INVALID_TYPE"
            | "MUST_NOT_BE_EMPTY" | "OUT_OF_RANGE" | "COMPROMISED_PASSWORD";
        description: string;
    },

    secondFactor: {
        field: "secondFactor" | "secondFactor.method" | "secondFactor.code" | "method" | "code";
        title: "REQUIRED" | "MUST_NOT_BE_NULL" | "INVALID_TYPE"
            | "MUST_NOT_BE_EMPTY" | "OUT_OF_RANGE" | "MUST_MATCH_PATTERN"
            | "INVALID_ENUM_VALUE";
        description: string;
    },
}
