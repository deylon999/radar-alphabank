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

const cancelJoinRequestSuccessOperationExample = #{
    parameters: #{
        companyId: "U_9250",
        requestId: "6a1d4e2f-8b3c-4f5a-9d7e-0c2b1a3f4e5d",
        csrfToken: csrfTokenExample
    },
    returnType: #{
        statusCode: 200,
        contentType: "application/json",
        cacheControl: "no-store",
        body: cancelledJoinRequestExample
    }
};

@post
@route("/{requestId}/cancel")
@summary("Отмена своей заявки")
@doc("""
    Доступно только заявителю. Заявка должна ждать решения.
    Переводит заявку в cancelled. После этого можно подать новую заявку или создать компанию.
    Владелец компании получает 403: вместо отмены он отклоняет заявку. Остальным возвращается 404.
    Если заявку уже одобрили или отклонили, в том числе одновременным запросом, возвращается 409.
    """)
@returnsDoc("Отменённая заявка.")
@opExample(cancelJoinRequestSuccessOperationExample)
@opExample(badRequestOperationExample)
@opExample(unauthorizedOperationExample)
@opExample(invalidCsrfOperationExample)
@opExample(joinRequestApplicantRequiredOperationExample)
@opExample(joinRequestNotFoundOperationExample)
@opExample(joinRequestNotPendingOperationExample)
op cancelJoinRequest(
    @doc("ID компании, в которую подана заявка.")
    @path companyId: CompanyId,

    @doc("ID своей заявки.")
    @path requestId: Uuid,

    ...CsrfParameters
):
    AlfaHackathonApi.Ok.OkResponse<JoinRequestResponse>
    | BadRequestError
    | UnauthorizedError
    | ForbiddenError<InvalidCsrfDetails | JoinRequestApplicantRequiredDetails>
    | NotFoundError<JoinRequestNotFoundDetails>
    | ConflictError<JoinRequestNotPendingDetails>;
