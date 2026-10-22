import "./CompanySummary.tsp";

namespace AlfaHackathonApi.Companies;

const companiesResponseExample: CompaniesResponse = #{
    companies: #[datasetCompanySummaryExample, userCompanySummaryExample]
};

@doc("Результат поиска компаний.")
@example(companiesResponseExample)
model CompaniesResponse {
    @doc("Не больше 20 компаний. Пустой массив, если совпадений нет.")
    @maxItems(20)
    companies: CompanySummary[];
}
