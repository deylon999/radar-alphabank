import "@typespec/http";

import "../model/request/SubmitJoinRequest.tsp";
import "../model/response/JoinRequestResponse.tsp";
import "../model/error/JoinRequestValidationIssue.tsp";
import "../../companies/model/error/CompanyErrors.tsp";
import "../model/error/JoinRequestErrors.tsp";

import "../../common";

using TypeSpec.Http;
using AlfaHackathonApi.Security;
using AlfaHackathonApi.Domain;
using AlfaHackathonApi.Errors;
using AlfaHackathonApi.Companies.Errors;
using AlfaHackathonApi.JoinRequests.Errors;

namespace AlfaHackathonApi.JoinRequests;

const submitJoinRequestSuccessOperationExample = #{
    parameters: #{ companyId: "U_9250", body: submitJoinRequestExample, csrfToken: csrfTokenExample },
    returnType: #{
        statusCode: 201,
        contentType: "application/json",
        cacheControl: "no-store",
        body: pendingJoinRequestExample
    }
};

@post
@summary("Подача заявки на вступление")
@doc("""
    Доступно пользователю, который не состоит в компании и не ждёт решения по другой заявке.
    Создаёт заявку в статусе pending. Пока заявку не одобрят, она не даёт доступа к профилю и аналитике компании.
    Владелец компании видит email заявителя, должность и сообщение.
    После отклонения или отмены можно подать новую заявку. Число заявок ограничено.
    """)
@returnsDoc("Созданная заявка.")
@opExample(submitJoinRequestSuccessOperationExample)
@opExample(badRequestOperationExample)
@opExample(joinRequestValidationOperationExample)
@opExample(unauthorizedOperationExample)
@opExample(invalidCsrfOperationExample)
@opExample(companyNotFoundOperationExample)
@opExample(alreadyCompanyMemberOperationExample)
@opExample(joinRequestPendingOperationExample)
@opExample(tooManyRequestsOperationExample)
op submitJoinRequest(
    @doc("ID компании из поиска.")
    @path companyId: CompanyId,

    ...CsrfParameters,
    @body body: SubmitJoinRequest
):
    AlfaHackathonApi.Ok.CreatedResponse<JoinRequestResponse>
    | BadRequestError
    | ValidationError<JoinRequestValidationIssue>
    | UnauthorizedError
    | ForbiddenError<InvalidCsrfDetails>
    | NotFoundError<CompanyNotFoundDetails>
    | ConflictError<AlreadyCompanyMemberDetails | JoinRequestPendingDetails>
    | TooManyRequestsError;
