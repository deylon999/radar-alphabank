import "@typespec/http";

import "../model/request/UpdateMembershipRequest.tsp";
import "../model/response/MembershipResponse.tsp";
import "../model/error/MeErrors.tsp";

import "../../common";

using TypeSpec.Http;
using AlfaHackathonApi.Security;
using AlfaHackathonApi.Domain;
using AlfaHackathonApi.Errors;
using AlfaHackathonApi.Me.Errors;

namespace AlfaHackathonApi.Me;

const updateMembershipSuccessOperationExample = #{
    parameters: #{ body: updateMembershipRequestExample, csrfToken: csrfTokenExample },
    returnType: #{
        statusCode: 200,
        contentType: "application/json",
        cacheControl: "no-store",
        body: #{ ...ownerMembershipExample, position: "cfo" }
    }
};

@patch
@route("/membership")
@summary("Смена своей должности")
@doc("""
    Меняет должность текущего пользователя в его компании. Чужую должность и роль доступа так не изменить.
    Должность влияет только на порядок ленты и не даёт прав. Новый порядок действует со следующего запроса.
    Если пользователь не состоит в компании, возвращается 404.
    """)
@returnsDoc("Членство с новой должностью.")
@opExample(updateMembershipSuccessOperationExample)
@opExample(badRequestOperationExample)
@opExample(membershipValidationOperationExample)
@opExample(unauthorizedOperationExample)
@opExample(invalidCsrfOperationExample)
@opExample(membershipNotFoundOperationExample)
op updateMembership(
    ...CsrfParameters,
    @body body: UpdateMembershipRequest
):
    AlfaHackathonApi.Ok.OkResponse<MembershipResponse>
    | BadRequestError
    | ValidationError<MembershipValidationIssue>
    | UnauthorizedError
    | ForbiddenError<InvalidCsrfDetails>
    | NotFoundError<MembershipNotFoundDetails>;
