import "@typespec/http";

import "../model/request/UpdateInsightStatusRequest.tsp";
import "../model/response/InsightResponse.tsp";
import "../model/error/InsightErrors.tsp";

import "../../common";

using TypeSpec.Http;
using AlfaHackathonApi.Security;
using AlfaHackathonApi.Domain;
using AlfaHackathonApi.Errors;
using AlfaHackathonApi.Insights.Errors;

namespace AlfaHackathonApi.Insights;

const markInsightReadOperationExample = #{
    parameters: #{ insightId: "9b1f3c5e-7a2d-4e6f-8b0c-1d3e5f7a9b2c", body: markReadRequestExample, csrfToken: csrfTokenExample },
    returnType: #{
        statusCode: 200,
        contentType: "application/json",
        cacheControl: "no-store",
        body: #{ ...keyRateInsightExample, status: "read" }
    }
};

const dismissInsightOperationExample = #{
    parameters: #{ insightId: "9b1f3c5e-7a2d-4e6f-8b0c-1d3e5f7a9b2c", body: dismissRequestExample, csrfToken: csrfTokenExample },
    returnType: #{
        statusCode: 200,
        contentType: "application/json",
        cacheControl: "no-store",
        body: #{ ...keyRateInsightExample, status: "dismissed" }
    }
};

@patch
@route("/insights/{insightId}")
@summary("Смена личного состояния вывода")
@doc("""
    Доступно любому участнику компании, к которой относится вывод. Меняет состояние только для текущего пользователя, у других участников оно прежнее.
    Клиент отправляет read при открытии карточки, dismissed при скрытии и прежнее значение при отмене.
    Допустим любой переход. Повторный запрос с тем же значением ничего не меняет.
    updatedAt не меняется: он отражает изменение содержимого и влияет на порядок ленты.
    """)
@returnsDoc("Вывод с новым состоянием.")
@opExample(markInsightReadOperationExample)
@opExample(dismissInsightOperationExample)
@opExample(badRequestOperationExample)
@opExample(insightStatusValidationOperationExample)
@opExample(unauthorizedOperationExample)
@opExample(invalidCsrfOperationExample)
@opExample(insightNotFoundOperationExample)
op updateInsightStatus(
    @doc("ID вывода.")
    @path insightId: Uuid,

    ...CsrfParameters,
    @body body: UpdateInsightStatusRequest
):
    AlfaHackathonApi.Ok.OkResponse<InsightResponse>
    | BadRequestError
    | ValidationError<InsightStatusValidationIssue>
    | UnauthorizedError
    | ForbiddenError<InvalidCsrfDetails>
    | NotFoundError<InsightNotFoundDetails>;
