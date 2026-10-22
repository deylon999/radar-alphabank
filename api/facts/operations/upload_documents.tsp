import "@typespec/http";

import "../model/request/UploadDocumentsRequest.tsp";
import "../model/response/ExtractedFactsResponse.tsp";
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
        statusCode: 200,
        contentType: "application/json",
        cacheControl: "no-store",
        body: #{ facts: #[#{ ...pendingFactExample, source: documentSourceExample }] }
    }
};

@post
@route("/documents")
@summary("Загрузка документов о компании")
@doc("""
    Доступно любому участнику компании. Извлекает факты из документов так же, как из описания.
    Тип файла определяется по содержимому, а не только по расширению. Ошибка в любом файле отклоняет весь запрос.
    Из большого документа может быть учтена только часть, такой документ попадает в incompleteSources.
    Оригиналы файлов после обработки не хранятся: остаются только имена файлов как источники фактов.
    Ответ приходит не позже чем через 60 секунд. Если обработка не успевает или модель недоступна, возвращается 503
    и факты из этого запроса не сохраняются.
    Если общий размер запроса больше допустимого, возвращается 413. Число запросов ограничено.
    """)
@returnsDoc("Новые факты.")
@opExample(uploadDocumentsSuccessOperationExample)
@opExample(badRequestOperationExample)
@opExample(documentsValidationOperationExample)
@opExample(unauthorizedOperationExample)
@opExample(invalidCsrfOperationExample)
@opExample(companyMembershipRequiredOperationExample)
@opExample(companyNotFoundOperationExample)
@opExample(contentTooLargeOperationExample)
@opExample(tooManyRequestsOperationExample)
@opExample(aiUnavailableOperationExample)
op uploadDocuments(
    @doc("ID компании.")
    @path companyId: CompanyId,

    ...CsrfParameters,

    @header("Content-Type")
    contentType: "multipart/form-data",

    @multipartBody body: UploadDocumentsRequest
):
    AlfaHackathonApi.Ok.OkResponse<ExtractedFactsResponse>
    | BadRequestError
    | ValidationError<DocumentsValidationIssue>
    | UnauthorizedError
    | ForbiddenError<InvalidCsrfDetails | CompanyMembershipRequiredDetails>
    | NotFoundError<CompanyNotFoundDetails>
    | ContentTooLargeError
    | TooManyRequestsError
    | ServiceUnavailableError<AiUnavailableDetails>;
