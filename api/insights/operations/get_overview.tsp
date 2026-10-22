import "@typespec/http";

import "../model/response/OverviewResponse.tsp";
import "../../companies/model/error/CompanyErrors.tsp";

import "../../common";

using TypeSpec.Http;
using AlfaHackathonApi.Security;
using AlfaHackathonApi.Domain;
using AlfaHackathonApi.Errors;
using AlfaHackathonApi.Companies.Errors;
using AlfaHackathonApi.Insights.Errors;

namespace AlfaHackathonApi.Insights;

const getOverviewSuccessOperationExample = #{
    parameters: #{ companyId: "U_9250" },
    returnType: #{
        statusCode: 200,
        contentType: "application/json",
        cacheControl: "no-store",
        body: overviewResponseExample
    }
};

@get
@route("/companies/{companyId}/overview")
@summary("Обзор по темам и материалам банка")
@doc("""
    Доступно любому участнику компании. Группирует актуальные выводы по темам и по материалам банка.
    Входят обе вкладки ленты; выводы, скрытые текущим пользователем, — нет. Внутри группы порядок как в ленте.
    """)
@returnsDoc("Обзор.")
@opExample(getOverviewSuccessOperationExample)
@opExample(unauthorizedOperationExample)
@opExample(companyMembershipRequiredOperationExample)
@opExample(companyNotFoundOperationExample)
op getOverview(
    @doc("ID компании.")
    @path companyId: CompanyId
):
    AlfaHackathonApi.Ok.OkResponse<OverviewResponse>
    | UnauthorizedError
    | ForbiddenError<CompanyMembershipRequiredDetails>
    | NotFoundError<CompanyNotFoundDetails>;
