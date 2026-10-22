import "@typespec/http";

import "../model/request/DescribeCompanyRequest.tsp";
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

const describeCompanySuccessOperationExample = #{
    parameters: #{ companyId: "U_9250", body: describeCompanyRequestExample, csrfToken: csrfTokenExample },
    returnType: #{
        statusCode: 200,
        contentType: "application/json",
        cacheControl: "no-store",
        body: extractedFactsResponseExample
    }
};

@post
@route("/describe")
@summary("Описание компании")
@doc("""
    Доступно любому участнику компании. Принимает описание своими словами и ссылки и извлекает из них факты.
    Непустой текст становится описанием компании (description) вместо прежнего.
    Новые факты появляются в статусе pending и не используются в аналитике, пока их не подтвердят.
    Факты, которые у компании уже есть, повторно не добавляются, поэтому повтор запроса не создаёт дублей.
    Ссылки сервер загружает сам: только https, без обращения к внутренним и частным адресам,
    с ограничением размера, времени и числа перенаправлений. Недоступная ссылка не считается ошибкой запроса
    и попадает в incompleteSources.
    Ответ приходит не позже чем через 15 секунд. Если обработка не успевает или модель недоступна, возвращается 503
    и факты из этого запроса не сохраняются. Число запросов ограничено.
    """)
@returnsDoc("Новые факты.")
@opExample(describeCompanySuccessOperationExample)
@opExample(badRequestOperationExample)
@opExample(describeValidationOperationExample)
@opExample(unauthorizedOperationExample)
@opExample(invalidCsrfOperationExample)
@opExample(companyMembershipRequiredOperationExample)
@opExample(companyNotFoundOperationExample)
@opExample(tooManyRequestsOperationExample)
@opExample(aiUnavailableOperationExample)
op describeCompany(
    @doc("ID компании.")
    @path companyId: CompanyId,

    ...CsrfParameters,
    @body body: DescribeCompanyRequest
):
    AlfaHackathonApi.Ok.OkResponse<ExtractedFactsResponse>
    | BadRequestError
    | ValidationError<DescribeValidationIssue>
    | UnauthorizedError
    | ForbiddenError<InvalidCsrfDetails | CompanyMembershipRequiredDetails>
    | NotFoundError<CompanyNotFoundDetails>
    | TooManyRequestsError
    | ServiceUnavailableError<AiUnavailableDetails>;
