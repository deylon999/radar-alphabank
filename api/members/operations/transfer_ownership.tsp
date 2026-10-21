import "@typespec/http";

import "../model/error/MemberErrors.tsp";
import "../../companies/model/error/CompanyErrors.tsp";

import "../../common";

using TypeSpec.Http;
using AlfaHackathonApi.Security;
using AlfaHackathonApi.Domain;
using AlfaHackathonApi.Errors;
using AlfaHackathonApi.Companies.Errors;
using AlfaHackathonApi.Members.Errors;

namespace AlfaHackathonApi.Members;

const transferOwnershipSuccessOperationExample = #{
    parameters: #{
        companyId: "U_9250",
        userId: "c3e1f7a2-4b6d-4e8f-a0c9-5d2b7e1f3a64",
        csrfToken: csrfTokenExample
    },
    returnType: #{
        statusCode: 204,
        cacheControl: "no-store"
    }
};

@post
@route("/{userId}/transfer-ownership")
@summary("Передача прав владельца")
@doc("""
    Доступно только владельцу компании. Нужно подтверждение через POST /auth/reauthenticate не старше 5 минут.
    В одной транзакции делает выбранного участника владельцем, а текущего владельца — участником с ролью member.
    Владелец в компании всегда ровно один. Должности обоих не меняются.
    Новые права действуют со следующего запроса, повторный вход не нужен.
    Если передать права самому себе, ничего не меняется.
    Повторный запрос бывшего владельца возвращает 403, потому что он уже не владелец.
    """)
@returnsDoc("Права владельца переданы.")
@opExample(transferOwnershipSuccessOperationExample)
@opExample(badRequestOperationExample)
@opExample(unauthorizedOperationExample)
@opExample(invalidCsrfOperationExample)
@opExample(companyMembershipRequiredOperationExample)
@opExample(companyOwnerRequiredOperationExample)
@opExample(reauthenticationRequiredOperationExample)
@opExample(companyNotFoundOperationExample)
@opExample(memberNotFoundOperationExample)
op transferOwnership(
    @doc("ID компании.")
    @path companyId: CompanyId,

    @doc("ID участника, который станет владельцем.")
    @path userId: Uuid,

    ...CsrfParameters
):
    AlfaHackathonApi.Ok.NoContentResponse
    | BadRequestError
    | UnauthorizedError
    | ForbiddenError<
          InvalidCsrfDetails
          | CompanyMembershipRequiredDetails
          | CompanyOwnerRequiredDetails
          | ReauthenticationRequiredDetails
      >
    | NotFoundError<CompanyNotFoundDetails | MemberNotFoundDetails>;
