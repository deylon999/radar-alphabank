import "../../../common/error/ValidationError.tsp";

using AlfaHackathonApi.Errors;

namespace AlfaHackathonApi.Companies.Errors;

const companyValidationExample: ValidationError<CompanyValidationIssue> = #{
    statusCode: 422,
    contentType: "application/problem+json",
    cacheControl: "no-store",
    body: #{
        type: "/problems/validation-failed",
        title: "Ошибка валидации",
        status: 422,
        errors: #[
            #{
                field: "inn",
                title: "INVALID_CHECKSUM",
                description: "Проверьте ИНН: контрольная цифра не совпадает."
            }
        ]
    }
};

const companySearchValidationExample: ValidationError<CompanyValidationIssue> = #{
    ...companyValidationExample,
    body: #{
        type: "/problems/validation-failed",
        title: "Ошибка валидации",
        status: 422,
        errors: #[
            #{
                field: "q",
                title: "OUT_OF_RANGE",
                description: "Поисковый запрос должен быть длиной от 2 до 100 символов."
            }
        ]
    }
};

const companyValidationOperationExample = #{ returnType: companyValidationExample };
const companySearchValidationOperationExample = #{ returnType: companySearchValidationExample };

@doc("Ошибки полей при поиске и создании компании.")
@example(#{ field: "inn", title: "INVALID_CHECKSUM", description: "Проверьте ИНН: контрольная цифра не совпадает." })
union CompanyValidationIssue {
    name: {
        field: "name";
        title: "REQUIRED" | "MUST_NOT_BE_NULL" | "INVALID_TYPE"
            | "MUST_NOT_BE_EMPTY" | "OUT_OF_RANGE";
        description: string;
    },

    inn: {
        field: "inn";
        title: "REQUIRED" | "MUST_NOT_BE_NULL" | "INVALID_TYPE"
            | "MUST_MATCH_PATTERN" | "INVALID_CHECKSUM";
        description: string;
    },

    position: {
        field: "position";
        title: "INVALID_TYPE" | "INVALID_ENUM_VALUE";
        description: string;
    },

    query: {
        field: "q";
        title: "REQUIRED" | "OUT_OF_RANGE";
        description: string;
    },
}
