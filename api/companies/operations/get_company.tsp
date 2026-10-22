import "@typespec/http";

import "../model/response/CompanyResponse.tsp";
import "../model/error/CompanyErrors.tsp";

import "../../common";

using TypeSpec.Http;
using AlfaHackathonApi.Security;
using AlfaHackathonApi.Domain;
using AlfaHackathonApi.Errors;
using AlfaHackathonApi.Companies.Errors;

namespace AlfaHackathonApi.Companies;

const getDatasetCompanyOperationExample = #{
    parameters: #{ companyId: "U_9250" },
    returnType: #{
        statusCode: 200,
        contentType: "application/json",
        cacheControl: "no-store",
        body: datasetCompanyExample
    }
};

const getNewCompanyOperationExample = #{
    parameters: #{ companyId: "3f6b8c2e-5d41-4a7e-9c0b-2e8f1a6d4b93" },
    returnType: #{
        statusCode: 200,
        contentType: "application/json",
        cacheControl: "no-store",
        body: newCompanyExample
    }
};

@get
@route("/{companyId}")
@summary("Профиль компании")
@doc("""
    Доступно любому участнику компании. Остальные получают 403, даже если нашли компанию через поиск.
    Возвращает данные банка, описание и сведения пользователей во всех статусах и готовность аналитики.
    У новой компании без подтверждённых сведений аналитика в состоянии needs_context:
    клиент предлагает рассказать о компании, а не показывает пустую ленту.
    """)
@returnsDoc("Профиль компании.")
@opExample(getDatasetCompanyOperationExample)
@opExample(getNewCompanyOperationExample)
@opExample(unauthorizedOperationExample)
@opExample(companyMembershipRequiredOperationExample)
@opExample(companyNotFoundOperationExample)
op getCompany(
    @doc("ID компании.")
    @path companyId: CompanyId
):
    AlfaHackathonApi.Ok.OkResponse<CompanyResponse>
    | UnauthorizedError
    | ForbiddenError<CompanyMembershipRequiredDetails>
    | NotFoundError<CompanyNotFoundDetails>;
