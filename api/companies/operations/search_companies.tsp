import "@typespec/http";

import "../model/response/CompaniesResponse.tsp";
import "../model/error/CompanyValidationIssue.tsp";

import "../../common";

using TypeSpec.Http;
using AlfaHackathonApi.Security;
using AlfaHackathonApi.Domain;
using AlfaHackathonApi.Errors;
using AlfaHackathonApi.Companies.Errors;

namespace AlfaHackathonApi.Companies;

const searchCompaniesSuccessOperationExample = #{
    parameters: #{ q: "логистика" },
    returnType: #{
        statusCode: 200,
        contentType: "application/json",
        cacheControl: "no-store",
        body: #{ companies: #[userCompanySummaryExample] }
    }
};

const searchCompaniesEmptyOperationExample = #{
    parameters: #{ q: "нет такой компании" },
    returnType: #{
        statusCode: 200,
        contentType: "application/json",
        cacheControl: "no-store",
        body: #{ companies: #[] }
    }
};

@get
@summary("Поиск компании")
@doc("""
    Нужен вход. Помогает найти компанию, чтобы подать заявку на вступление.
    Ищет по части названия без учёта регистра, а также по точному ID или ИНН.
    Возвращает только публичные карточки, без профиля и аналитики. Доступа к компании результат не даёт.
    Сначала идут точные совпадения ID и ИНН, затем совпадения по названию в алфавитном порядке. Не больше 20 результатов.
    Если ничего не найдено, возвращается пустой массив. Число запросов ограничено.
    """)
@returnsDoc("Найденные компании.")
@opExample(searchCompaniesSuccessOperationExample)
@opExample(searchCompaniesEmptyOperationExample)
@opExample(companySearchValidationOperationExample)
@opExample(unauthorizedOperationExample)
@opExample(tooManyRequestsOperationExample)
op searchCompanies(
    @doc("Часть названия, ID или ИНН, от 2 до 100 символов. Пробелы по краям отбрасываются.")
    @query
    @minLength(2)
    @maxLength(100)
    q: string
):
    AlfaHackathonApi.Ok.OkResponse<CompaniesResponse>
    | ValidationError<CompanyValidationIssue>
    | UnauthorizedError
    | TooManyRequestsError;
