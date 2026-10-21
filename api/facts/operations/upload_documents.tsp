import "@typespec/http";

import "../model/request/UploadDocumentsRequest.tsp";
import "../model/response/ExtractionResponse.tsp";
import "../model/error/FactValidationIssue.tsp";
import "../../companies/model/error/CompanyErrors.tsp";

import "../../common";

using TypeSpec.Http;
using AlfaHackathonApi.Security;
using AlfaHackathonApi.Domain;
using AlfaHackathonApi.Errors;
using AlfaHackathonApi.Companies.Errors;
using AlfaHackathonApi.Facts.Errors;

namespace AlfaHackathonApi.Facts;

const uploadDocumentsSuccessOperationExample = #{
    returnType: #{
        statusCode: 202,
        contentType: "application/json",
        cacheControl: "no-store",
        location: "/api/companies/U_9250/extractions/0a9b8c7d-6e5f-4a3b-9c2d-1e0f9a8b7c6d",
        body: #{
            ...processingExtractionExample,
            id: "0a9b8c7d-6e5f-4a3b-9c2d-1e0f9a8b7c6d",
            sources: #[documentSourceExample]
        }
    }
};

@post
@route("/documents")
@summary("Загрузка документов о компании")
@doc("""
    Доступно любому участнику компании. Принимает документы, а факты извлекает в фоне так же, как описание:
    ответ приходит сразу, результат — по адресу из Location.
    Тип файла определяется по содержимому, а не только по расширению. Ошибка в любом файле отклоняет весь запрос.
    Из большого документа может быть учтена только часть, такой документ попадает в incompleteSources.
    Оригиналы файлов после обработки не хранятся: остаются только имена файлов как источники фактов.
    Если общий размер запроса больше допустимого, возвращается 413. Число запросов ограничено.
    """)
@returnsDoc("Документы приняты, извлечение выполняется.")
@opExample(uploadDocumentsSuccessOperationExample)
@opExample(badRequestOperationExample)
@opExample(documentsValidationOperationExample)
@opExample(unauthorizedOperationExample)
@opExample(invalidCsrfOperationExample)
@opExample(companyMembershipRequiredOperationExample)
@opExample(companyNotFoundOperationExample)
@opExample(contentTooLargeOperationExample)
@opExample(tooManyRequestsOperationExample)
op uploadDocuments(
    @doc("ID компании.")
    @path companyId: CompanyId,

    ...CsrfParameters,

    @header("Content-Type")
    contentType: "multipart/form-data",

    @multipartBody body: UploadDocumentsRequest
):
    AlfaHackathonApi.Ok.AcceptedResponse<ExtractionResponse>
    | BadRequestError
    | ValidationError<DocumentsValidationIssue>
    | UnauthorizedError
    | ForbiddenError<InvalidCsrfDetails | CompanyMembershipRequiredDetails>
    | NotFoundError<CompanyNotFoundDetails>
    | ContentTooLargeError
    | TooManyRequestsError;
