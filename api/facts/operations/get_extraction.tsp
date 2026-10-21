import "@typespec/http";

import "../model/response/ExtractionResponse.tsp";
import "../model/error/FactErrors.tsp";
import "../../companies/model/error/CompanyErrors.tsp";

import "../../common";

using TypeSpec.Http;
using AlfaHackathonApi.Security;
using AlfaHackathonApi.Domain;
using AlfaHackathonApi.Errors;
using AlfaHackathonApi.Companies.Errors;
using AlfaHackathonApi.Facts.Errors;

namespace AlfaHackathonApi.Facts;

const getExtractionProcessingOperationExample = #{
    parameters: #{ companyId: "U_9250", extractionId: "f1e2d3c4-b5a6-4978-8a9b-0c1d2e3f4a5b" },
    returnType: #{
        statusCode: 200,
        contentType: "application/json",
        cacheControl: "no-store",
        body: processingExtractionExample
    }
};

const getExtractionCompletedOperationExample = #{
    parameters: #{ companyId: "U_9250", extractionId: "f1e2d3c4-b5a6-4978-8a9b-0c1d2e3f4a5b" },
    returnType: #{
        statusCode: 200,
        contentType: "application/json",
        cacheControl: "no-store",
        body: completedExtractionExample
    }
};

const getExtractionFailedOperationExample = #{
    parameters: #{ companyId: "U_9250", extractionId: "f1e2d3c4-b5a6-4978-8a9b-0c1d2e3f4a5b" },
    returnType: #{
        statusCode: 200,
        contentType: "application/json",
        cacheControl: "no-store",
        body: failedExtractionExample
    }
};

@get
@route("/extractions/{extractionId}")
@summary("Состояние извлечения фактов")
@doc("""
    Доступно любому участнику компании, а не только тому, кто отправил материалы.
    Клиент опрашивает адрес из Location, пока статус processing. Неудача обработки — это ответ 200 со статусом failed,
    а не ошибка HTTP: сам запрос состояния выполнен успешно.
    """)
@returnsDoc("Текущее состояние извлечения.")
@opExample(getExtractionProcessingOperationExample)
@opExample(getExtractionCompletedOperationExample)
@opExample(getExtractionFailedOperationExample)
@opExample(badRequestOperationExample)
@opExample(unauthorizedOperationExample)
@opExample(companyMembershipRequiredOperationExample)
@opExample(companyNotFoundOperationExample)
@opExample(extractionNotFoundOperationExample)
op getExtraction(
    @doc("ID компании.")
    @path companyId: CompanyId,

    @doc("ID извлечения из ответа describe или documents.")
    @path extractionId: Uuid
):
    AlfaHackathonApi.Ok.OkResponse<ExtractionResponse>
    | BadRequestError
    | UnauthorizedError
    | ForbiddenError<CompanyMembershipRequiredDetails>
    | NotFoundError<CompanyNotFoundDetails | ExtractionNotFoundDetails>;
