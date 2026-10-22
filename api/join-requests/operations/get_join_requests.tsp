import "@typespec/http";

import "../model/response/JoinRequestsResponse.tsp";
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

const getJoinRequestsSuccessOperationExample = #{
    parameters: #{ companyId: "U_9250" },
    returnType: #{
        statusCode: 200,
        contentType: "application/json",
        cacheControl: "no-store",
        body: joinRequestsResponseExample
    }
};

@get
@summary("Заявки на вступление в компанию")
@doc("""
    Доступно только владельцу компании. Возвращает заявки, ожидающие решения, сначала самые старые.
    Решённые и отменённые заявки в список не входят.
    """)
@returnsDoc("Заявки, ожидающие решения.")
@opExample(getJoinRequestsSuccessOperationExample)
@opExample(unauthorizedOperationExample)
@opExample(companyMembershipRequiredOperationExample)
@opExample(companyOwnerRequiredOperationExample)
@opExample(companyNotFoundOperationExample)
op getJoinRequests(
    @doc("ID компании.")
    @path companyId: CompanyId
):
    AlfaHackathonApi.Ok.OkResponse<JoinRequestsResponse>
    | UnauthorizedError
    | ForbiddenError<CompanyMembershipRequiredDetails | CompanyOwnerRequiredDetails>
    | NotFoundError<CompanyNotFoundDetails>;
