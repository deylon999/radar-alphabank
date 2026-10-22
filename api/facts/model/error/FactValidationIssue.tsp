import "../../../common/error/ValidationError.tsp";

using AlfaHackathonApi.Errors;

namespace AlfaHackathonApi.Facts.Errors;

const describeValidationExample: ValidationError<DescribeValidationIssue> = #{
    statusCode: 422,
    contentType: "application/problem+json",
    cacheControl: "no-store",
    body: #{
        type: "/problems/validation-failed",
        title: "Ошибка валидации",
        status: 422,
        detail: "Опишите компанию или добавьте ссылку.",
        errors: #[
            #{
                field: "text",
                title: "TEXT_OR_LINKS_REQUIRED",
                description: "Опишите компанию или добавьте ссылку."
            }
        ]
    }
};

const documentsValidationExample: ValidationError<DocumentsValidationIssue> = #{
    statusCode: 422,
    contentType: "application/problem+json",
    cacheControl: "no-store",
    body: #{
        type: "/problems/validation-failed",
        title: "Ошибка валидации",
        status: 422,
        detail: "Файл «Отчёт.xlsx»: допустимы только PDF, DOCX и TXT.",
        errors: #[
            #{
                field: "files[1]",
                title: "UNSUPPORTED_FILE_TYPE",
                description: "Файл «Отчёт.xlsx»: допустимы только PDF, DOCX и TXT."
            }
        ]
    }
};

const factValidationExample: ValidationError<FactValidationIssue> = #{
    statusCode: 422,
    contentType: "application/problem+json",
    cacheControl: "no-store",
    body: #{
        type: "/problems/validation-failed",
        title: "Ошибка валидации",
        status: 422,
        detail: "Исправленный факт должен быть подтверждён.",
        errors: #[
            #{
                field: "status",
                title: "MUST_BE_CONFIRMED",
                description: "Исправленный факт должен быть подтверждён."
            }
        ]
    }
};

const describeValidationOperationExample = #{ returnType: describeValidationExample };
const documentsValidationOperationExample = #{ returnType: documentsValidationExample };
const factValidationOperationExample = #{ returnType: factValidationExample };

@doc("Ошибки полей описания компании.")
@example(#{ field: "text", title: "TEXT_OR_LINKS_REQUIRED", description: "Опишите компанию или добавьте ссылку." })
union DescribeValidationIssue {
    text: {
        field: "text";
        title: "INVALID_TYPE" | "OUT_OF_RANGE" | "TEXT_OR_LINKS_REQUIRED";
        description: string;
    },

    links: {
        field: "links";
        title: "INVALID_TYPE" | "OUT_OF_RANGE";
        description: string;
    },

    link: {
        @doc("Ссылка по номеру, начиная с нуля: links[0].")
        @pattern("^links\\[[0-9]+\\]$")
        field: string;

        @doc("INVALID_FORMAT — не https-адрес.")
        title: "INVALID_TYPE" | "INVALID_FORMAT";

        description: string;
    },
}

@doc("Ошибки загрузки документов.")
@example(#{ field: "files[1]", title: "FILE_TOO_LARGE", description: "Файл «Отчёт.pdf» больше 10 МБ." })
union DocumentsValidationIssue {
    files: {
        field: "files";
        title: "REQUIRED" | "OUT_OF_RANGE";
        description: string;
    },

    file: {
        @doc("Файл по номеру, начиная с нуля: files[0].")
        @pattern("^files\\[[0-9]+\\]$")
        field: string;

        @doc("UNSUPPORTED_FILE_TYPE — содержимое не PDF, DOCX или TXT; FILE_TOO_LARGE — больше 10 МБ.")
        title: "UNSUPPORTED_FILE_TYPE" | "FILE_TOO_LARGE";

        description: string;
    },
}

@doc("Ошибки полей при изменении факта.")
@example(#{ field: "status", title: "MUST_BE_CONFIRMED", description: "Исправленный факт должен быть подтверждён." })
union FactValidationIssue {
    status: {
        field: "status";

        @doc("STATUS_OR_STATEMENT_REQUIRED — тело без status и statement; MUST_BE_CONFIRMED — statement передан с другим статусом.")
        title: "INVALID_TYPE" | "INVALID_ENUM_VALUE" | "STATUS_OR_STATEMENT_REQUIRED" | "MUST_BE_CONFIRMED";

        description: string;
    },

    statement: {
        field: "statement";
        title: "INVALID_TYPE" | "MUST_NOT_BE_EMPTY" | "OUT_OF_RANGE";
        description: string;
    },
}
