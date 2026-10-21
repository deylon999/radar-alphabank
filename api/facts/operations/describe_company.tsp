import "@typespec/http";

import "../model/request/DescribeCompanyRequest.tsp";
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

const extractionLocationExample = "/api/companies/U_9250/extractions/f1e2d3c4-b5a6-4978-8a9b-0c1d2e3f4a5b";

const describeCompanySuccessOperationExample = #{
    parameters: #{ companyId: "U_9250", body: describeCompanyRequestExample, csrfToken: csrfTokenExample },
    returnType: #{
        statusCode: 202,
        contentType: "application/json",
        cacheControl: "no-store",
        location: extractionLocationExample,
        body: processingExtractionExample
    }
};

@post
@route("/describe")
@summary("Описание компании")
@doc("""
    Доступно любому участнику компании. Принимает описание своими словами и ссылки, а факты извлекает в фоне.
    Ответ приходит сразу; результат клиент получает по адресу из Location, пока статус не станет completed или failed.
    Новые факты появляются в статусе pending и не используются в аналитике, пока их не подтвердят.
    Факты, которые у компании уже есть, повторно не добавляются, поэтому повтор запроса не создаёт дублей.
    Ссылки сервер загружает сам: только https, без обращения к внутренним и частным адресам,
    с ограничением размера, времени и числа перенаправлений. Недоступная ссылка не считается ошибкой запроса
    и попадает в incompleteSources. Число запросов ограничено; при исчерпании лимита анализа возвращается 429.
    """)
@returnsDoc("Запрос принят, извлечение выполняется.")
@opExample(describeCompanySuccessOperationExample)
@opExample(badRequestOperationExample)
@opExample(describeValidationOperationExample)
@opExample(unauthorizedOperationExample)
@opExample(invalidCsrfOperationExample)
@opExample(companyMembershipRequiredOperationExample)
@opExample(companyNotFoundOperationExample)
@opExample(tooManyRequestsOperationExample)
op describeCompany(
    @doc("ID компании.")
    @path companyId: CompanyId,

    ...CsrfParameters,
    @body body: DescribeCompanyRequest
):
    AlfaHackathonApi.Ok.AcceptedResponse<ExtractionResponse>
    | BadRequestError
    | ValidationError<DescribeValidationIssue>
    | UnauthorizedError
    | ForbiddenError<InvalidCsrfDetails | CompanyMembershipRequiredDetails>
    | NotFoundError<CompanyNotFoundDetails>
    | TooManyRequestsError;
