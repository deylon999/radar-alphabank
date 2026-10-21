import "../../../common/error/NotFoundError.tsp";

using AlfaHackathonApi.Errors;

namespace AlfaHackathonApi.Facts.Errors;

@doc("Факта нет среди фактов этой компании.")
model FactNotFoundDetails {
    ...OmitProperties<ProblemDetails<404>, "type">;
    type: "/problems/fact-not-found";
}

@doc("Извлечения нет среди извлечений этой компании.")
model ExtractionNotFoundDetails {
    ...OmitProperties<ProblemDetails<404>, "type">;
    type: "/problems/extraction-not-found";
}

const factNotFoundExample: NotFoundError<FactNotFoundDetails> = #{
    statusCode: 404,
    contentType: "application/problem+json",
    cacheControl: "no-store",
    body: #{
        type: "/problems/fact-not-found",
        title: "Факт не найден",
        status: 404,
        detail: "У компании нет такого факта."
    }
};

const factNotFoundOperationExample = #{ returnType: factNotFoundExample };

const extractionNotFoundExample: NotFoundError<ExtractionNotFoundDetails> = #{
    statusCode: 404,
    contentType: "application/problem+json",
    cacheControl: "no-store",
    body: #{
        type: "/problems/extraction-not-found",
        title: "Обработка не найдена",
        status: 404,
        detail: "У компании нет такой обработки."
    }
};

const extractionNotFoundOperationExample = #{ returnType: extractionNotFoundExample };
