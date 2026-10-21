import "@typespec/http";

import "../model/response/DigestResponse.tsp";
import "../../companies/model/error/CompanyErrors.tsp";

import "../../common";

using TypeSpec.Http;
using AlfaHackathonApi.Security;
using AlfaHackathonApi.Domain;
using AlfaHackathonApi.Errors;
using AlfaHackathonApi.Companies.Errors;
using AlfaHackathonApi.Insights.Errors;

namespace AlfaHackathonApi.Insights;

const getDigestSuccessOperationExample = #{
    parameters: #{ companyId: "U_9250" },
    returnType: #{
        statusCode: 200,
        contentType: "application/json",
        cacheControl: "no-store",
        body: digestResponseExample
    }
};

@get
@route("/digest")
@summary("Сводка за неделю")
@doc("""
    Доступно любому участнику компании. Считает выводы вкладки «Главное» за последние 7 суток.
    Сводка личная: выводы, скрытые текущим пользователем, не учитываются.
    Если выводов нет, все счётчики равны нулю.
    """)
@returnsDoc("Сводка.")
@opExample(getDigestSuccessOperationExample)
@opExample(unauthorizedOperationExample)
@opExample(companyMembershipRequiredOperationExample)
@opExample(companyNotFoundOperationExample)
op getDigest(
    @doc("ID компании.")
    @path companyId: CompanyId
):
    AlfaHackathonApi.Ok.OkResponse<DigestResponse>
    | UnauthorizedError
    | ForbiddenError<CompanyMembershipRequiredDetails>
    | NotFoundError<CompanyNotFoundDetails>;
