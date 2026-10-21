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

const removeMemberSuccessOperationExample = #{
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

@delete
@route("/{userId}")
@summary("Исключение участника или выход из компании")
@doc("""
    Владелец может исключить любого участника. Любой участник может выйти сам, передав свой userId.
    Владелец выйти не может: сначала он передаёт права другому участнику, иначе 409.
    Доступ к компании пропадает со следующего запроса. Аккаунт и сессии пользователя сохраняются.
    После этого пользователь может подать заявку или создать компанию.
    Повторный запрос для уже исключённого пользователя возвращает 404.
    """)
@returnsDoc("Пользователь больше не состоит в компании.")
@opExample(removeMemberSuccessOperationExample)
@opExample(badRequestOperationExample)
@opExample(unauthorizedOperationExample)
@opExample(invalidCsrfOperationExample)
@opExample(companyMembershipRequiredOperationExample)
@opExample(companyOwnerRequiredOperationExample)
@opExample(companyNotFoundOperationExample)
@opExample(memberNotFoundOperationExample)
@opExample(ownerCannotLeaveOperationExample)
op removeMember(
    @doc("ID компании.")
    @path companyId: CompanyId,

    @doc("ID пользователя из списка участников или свой ID для выхода.")
    @path userId: Uuid,

    ...CsrfParameters
):
    AlfaHackathonApi.Ok.NoContentResponse
    | BadRequestError
    | UnauthorizedError
    | ForbiddenError<InvalidCsrfDetails | CompanyMembershipRequiredDetails | CompanyOwnerRequiredDetails>
    | NotFoundError<CompanyNotFoundDetails | MemberNotFoundDetails>
    | ConflictError<OwnerCannotLeaveDetails>;
