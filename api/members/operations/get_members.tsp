import "@typespec/http";

import "../model/response/MembersResponse.tsp";
import "../../companies/model/error/CompanyErrors.tsp";

import "../../common";

using TypeSpec.Http;
using AlfaHackathonApi.Security;
using AlfaHackathonApi.Domain;
using AlfaHackathonApi.Errors;
using AlfaHackathonApi.Companies.Errors;

namespace AlfaHackathonApi.Members;

const getMembersSuccessOperationExample = #{
    parameters: #{ companyId: "U_9250" },
    returnType: #{
        statusCode: 200,
        contentType: "application/json",
        cacheControl: "no-store",
        body: membersResponseExample
    }
};

@get
@summary("Участники компании")
@doc("""
    Доступно любому участнику компании. Показывает email, роль и должность каждого участника.
    Заявители, ещё не принятые в компанию, в список не входят.
    """)
@returnsDoc("Участники компании.")
@opExample(getMembersSuccessOperationExample)
@opExample(unauthorizedOperationExample)
@opExample(companyMembershipRequiredOperationExample)
@opExample(companyNotFoundOperationExample)
op getMembers(
    @doc("ID компании.")
    @path companyId: CompanyId
):
    AlfaHackathonApi.Ok.OkResponse<MembersResponse>
    | UnauthorizedError
    | ForbiddenError<CompanyMembershipRequiredDetails>
    | NotFoundError<CompanyNotFoundDetails>;
