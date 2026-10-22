import "@typespec/http";

import "../model/request/CreateCompanyRequest.tsp";
import "../model/response/CompanySummary.tsp";
import "../model/error/CompanyErrors.tsp";
import "../model/error/CompanyValidationIssue.tsp";

import "../../common";

using TypeSpec.Http;
using AlfaHackathonApi.Security;
using AlfaHackathonApi.Domain;
using AlfaHackathonApi.Errors;
using AlfaHackathonApi.Companies.Errors;

namespace AlfaHackathonApi.Companies;

const createCompanySuccessOperationExample = #{
    parameters: #{ body: createCompanyRequestExample, csrfToken: csrfTokenExample },
    returnType: #{
        statusCode: 201,
        contentType: "application/json",
        cacheControl: "no-store",
        body: userCompanySummaryExample
    }
};

@post
@summary("Создание компании")
@doc("""
    Доступно пользователю, который не состоит в компании и не ждёт решения по заявке.
    Создаёт компанию и делает создателя её владельцем в одной транзакции. Изменение действует со следующего запроса.
    Название и ИНН сохраняются как сведения пользователя: они не проверяются по реестру и не становятся данными банка.
    Компанию из данных банка так присвоить нельзя: ID от клиента не принимается, совпадение названия или ИНН ни к чему не привязывает.
    Профиль и контекст для аналитики заполняются отдельно.
    Повторный запрос после успеха вернёт 409, потому что пользователь уже состоит в компании.
    """)
@returnsDoc("Созданная компания. Текущий пользователь — её владелец.")
@opExample(createCompanySuccessOperationExample)
@opExample(badRequestOperationExample)
@opExample(companyValidationOperationExample)
@opExample(unauthorizedOperationExample)
@opExample(invalidCsrfOperationExample)
@opExample(alreadyCompanyMemberOperationExample)
@opExample(joinRequestPendingOperationExample)
@opExample(tooManyRequestsOperationExample)
op createCompany(
    ...CsrfParameters,
    @body body: CreateCompanyRequest
):
    AlfaHackathonApi.Ok.CreatedResponse<CompanySummary>
    | BadRequestError
    | ValidationError<CompanyValidationIssue>
    | UnauthorizedError
    | ForbiddenError<InvalidCsrfDetails>
    | ConflictError<AlreadyCompanyMemberDetails | JoinRequestPendingDetails>
    | TooManyRequestsError;
