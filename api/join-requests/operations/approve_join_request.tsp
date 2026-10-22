import "@typespec/http";

import "../model/response/JoinRequestResponse.tsp";
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

const approveJoinRequestSuccessOperationExample = #{
    parameters: #{
        companyId: "U_9250",
        requestId: "6a1d4e2f-8b3c-4f5a-9d7e-0c2b1a3f4e5d",
        csrfToken: csrfTokenExample
    },
    returnType: #{
        statusCode: 200,
        contentType: "application/json",
        cacheControl: "no-store",
        body: approvedJoinRequestExample
    }
};

@post
@route("/{requestId}/approve")
@summary("Одобрение заявки")
@doc("""
    Доступно только владельцу компании. Заявка должна ждать решения.
    В одной транзакции переводит заявку в approved и делает заявителя участником с ролью member
    и должностью из заявки. Доступ появляется у заявителя со следующего запроса, повторный вход не нужен.
    Если заявку уже одобрили, отклонили или отменили, в том числе одновременным запросом, возвращается 409.
    """)
@returnsDoc("Одобренная заявка. Заявитель стал участником.")
@opExample(approveJoinRequestSuccessOperationExample)
@opExample(badRequestOperationExample)
@opExample(unauthorizedOperationExample)
@opExample(invalidCsrfOperationExample)
@opExample(companyMembershipRequiredOperationExample)
@opExample(companyOwnerRequiredOperationExample)
@opExample(companyNotFoundOperationExample)
@opExample(joinRequestNotFoundOperationExample)
@opExample(joinRequestNotPendingOperationExample)
op approveJoinRequest(
    @doc("ID компании.")
    @path companyId: CompanyId,

    @doc("ID заявки из списка заявок компании.")
    @path requestId: Uuid,

    ...CsrfParameters
):
    AlfaHackathonApi.Ok.OkResponse<JoinRequestResponse>
    | BadRequestError
    | UnauthorizedError
    | ForbiddenError<InvalidCsrfDetails | CompanyMembershipRequiredDetails | CompanyOwnerRequiredDetails>
    | NotFoundError<CompanyNotFoundDetails | JoinRequestNotFoundDetails>
    | ConflictError<JoinRequestNotPendingDetails>;
