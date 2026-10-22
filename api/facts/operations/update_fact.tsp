import "@typespec/http";

import "../model/request/UpdateFactRequest.tsp";
import "../model/response/ProfileFactResponse.tsp";
import "../model/error/FactErrors.tsp";
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

const confirmFactSuccessOperationExample = #{
    parameters: #{
        companyId: "U_9250",
        factId: "8d2f6a1c-3b4e-4c5d-9e7f-1a2b3c4d5e6f",
        body: confirmFactRequestExample,
        csrfToken: csrfTokenExample
    },
    returnType: #{
        statusCode: 200,
        contentType: "application/json",
        cacheControl: "no-store",
        body: #{
            ...pendingFactExample,
            status: "confirmed",
            updatedAt: utcDateTime.fromISO("2026-10-18T13:05:00Z"),
            updatedBy: #{ userId: "b95b680c-67b7-4d2e-bbd3-3b63d4cc7d61", email: "ivan@example.com" }
        }
    }
};

const correctFactSuccessOperationExample = #{
    parameters: #{
        companyId: "U_9250",
        factId: "8d2f6a1c-3b4e-4c5d-9e7f-1a2b3c4d5e6f",
        body: correctFactRequestExample,
        csrfToken: csrfTokenExample
    },
    returnType: #{
        statusCode: 200,
        contentType: "application/json",
        cacheControl: "no-store",
        body: #{
            ...pendingFactExample,
            status: "confirmed",
            statement: "Спецтехнику закупаем у производителей из Китая и Беларуси.",
            updatedAt: utcDateTime.fromISO("2026-10-18T13:06:00Z"),
            updatedBy: #{ userId: "b95b680c-67b7-4d2e-bbd3-3b63d4cc7d61", email: "ivan@example.com" }
        }
    }
};

@patch
@route("/facts/{factId}")
@summary("Изменение факта")
@doc("""
    Доступно любому участнику компании. Меняет оценку факта, формулировку или оба поля.
    Статус — это оценка пользователей, а не этап обработки, поэтому допустим любой переход,
    в том числе возврат к прежнему статусу при отмене действия.
    Исправленная формулировка всегда делает факт подтверждённым. Если значения не меняются, факт остаётся прежним.
    Запоминаются время и автор изменения. При одновременных правках сохраняется последняя.
    Изменение подтверждённых сведений может перевести аналитику компании в состояние preparing.
    """)
@returnsDoc("Факт после изменения.")
@opExample(confirmFactSuccessOperationExample)
@opExample(correctFactSuccessOperationExample)
@opExample(badRequestOperationExample)
@opExample(factValidationOperationExample)
@opExample(unauthorizedOperationExample)
@opExample(invalidCsrfOperationExample)
@opExample(companyMembershipRequiredOperationExample)
@opExample(companyNotFoundOperationExample)
@opExample(factNotFoundOperationExample)
op updateFact(
    @doc("ID компании.")
    @path companyId: CompanyId,

    @doc("ID факта.")
    @path factId: Uuid,

    ...CsrfParameters,
    @body body: UpdateFactRequest
):
    AlfaHackathonApi.Ok.OkResponse<ProfileFactResponse>
    | BadRequestError
    | ValidationError<FactValidationIssue>
    | UnauthorizedError
    | ForbiddenError<InvalidCsrfDetails | CompanyMembershipRequiredDetails>
    | NotFoundError<CompanyNotFoundDetails | FactNotFoundDetails>;
