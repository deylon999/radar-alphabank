import "@typespec/http";

import "../model/response/InsightResponse.tsp";
import "../model/error/InsightErrors.tsp";
import "../../companies/model/error/CompanyErrors.tsp";

import "../../common";

using TypeSpec.Http;
using AlfaHackathonApi.Security;
using AlfaHackathonApi.Domain;
using AlfaHackathonApi.Errors;
using AlfaHackathonApi.Companies.Errors;
using AlfaHackathonApi.Insights.Errors;

namespace AlfaHackathonApi.Insights;

const getInsightSuccessOperationExample = #{
    parameters: #{ companyId: "U_9250", insightId: "9b1f3c5e-7a2d-4e6f-8b0c-1d3e5f7a9b2c" },
    returnType: #{
        statusCode: 200,
        contentType: "application/json",
        cacheControl: "no-store",
        body: keyRateInsightExample
    }
};

@get
@route("/insights/{insightId}")
@summary("Карточка вывода")
@doc("""
    Доступно любому участнику компании. Возвращает вывод целиком, status — для текущего пользователя.
    Скрытый вывод тоже доступен по ID. Чтение не меняет состояние: отметку о прочтении клиент ставит отдельно.
    Вывод другой компании возвращает 404.
    """)
@returnsDoc("Вывод.")
@opExample(getInsightSuccessOperationExample)
@opExample(badRequestOperationExample)
@opExample(unauthorizedOperationExample)
@opExample(companyMembershipRequiredOperationExample)
@opExample(companyNotFoundOperationExample)
@opExample(insightNotFoundOperationExample)
op getInsight(
    @doc("ID компании.")
    @path companyId: CompanyId,

    @doc("ID вывода.")
    @path insightId: Uuid
):
    AlfaHackathonApi.Ok.OkResponse<InsightResponse>
    | BadRequestError
    | UnauthorizedError
    | ForbiddenError<CompanyMembershipRequiredDetails>
    | NotFoundError<CompanyNotFoundDetails | InsightNotFoundDetails>;
