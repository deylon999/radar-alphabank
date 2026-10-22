import "../../../common/error/NotFoundError.tsp";
import "../../../common/error/ValidationError.tsp";

using AlfaHackathonApi.Errors;

namespace AlfaHackathonApi.Me.Errors;

@doc("Пользователь не состоит в компании, поэтому членства нет.")
model MembershipNotFoundDetails {
    ...OmitProperties<ProblemDetails<404>, "type">;
    type: "/problems/membership-not-found";
}

const membershipNotFoundExample: NotFoundError<MembershipNotFoundDetails> = #{
    statusCode: 404,
    contentType: "application/problem+json",
    cacheControl: "no-store",
    body: #{
        type: "/problems/membership-not-found",
        title: "Вы не состоите в компании",
        status: 404,
        detail: "Должность указывается после вступления в компанию."
    }
};

const membershipNotFoundOperationExample = #{ returnType: membershipNotFoundExample };

const membershipValidationExample: ValidationError<MembershipValidationIssue> = #{
    statusCode: 422,
    contentType: "application/problem+json",
    cacheControl: "no-store",
    body: #{
        type: "/problems/validation-failed",
        title: "Ошибка валидации",
        status: 422,
        detail: "Выберите должность из списка.",
        errors: #[
            #{
                field: "position",
                title: "INVALID_ENUM_VALUE",
                description: "Выберите должность из списка."
            }
        ]
    }
};

const membershipValidationOperationExample = #{ returnType: membershipValidationExample };

@doc("Ошибки полей при изменении своего членства.")
@example(#{ field: "position", title: "INVALID_ENUM_VALUE", description: "Выберите должность из списка." })
union MembershipValidationIssue {
    position: {
        field: "position";
        title: "REQUIRED" | "MUST_NOT_BE_NULL" | "INVALID_TYPE" | "INVALID_ENUM_VALUE";
        description: string;
    },
}
