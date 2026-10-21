import "./CompanySummary.tsp";
import "./BankData.tsp";
import "../../../facts/model/response/ProfileFactResponse.tsp";

using AlfaHackathonApi.Facts;

namespace AlfaHackathonApi.Companies;

const datasetCompanyExample: CompanyResponse = #{
    ...datasetCompanySummaryExample,
    bankData: bankDataExample,
    facts: #[pendingFactExample, confirmedFactExample],
    analysis: #{ status: "ready" }
};

const newCompanyExample: CompanyResponse = #{
    ...userCompanySummaryExample,
    facts: #[],
    analysis: #{ status: "needs_context" }
};

@doc("""
    Готовность аналитики компании. Порог достаточности сведений определяет сервер.
    needs_context — подтверждённых сведений недостаточно, пользователю стоит рассказать о компании;
    preparing — сведения появились или изменились, аналитика готовится;
    ready — аналитика сформирована, в том числе если значимых событий нет.
    """)
union AnalysisStatus {
    "needs_context",
    "preparing",
    "ready",
}

@doc("Состояние аналитики компании.")
model CompanyAnalysis {
    @doc("Готовность аналитики.")
    status: AnalysisStatus;
}

@doc("""
    Профиль компании для её участников. Данные банка и сведения пользователей разделены:
    bankData приходит из датасета, facts — от пользователей и не становятся данными банка.
    """)
@example(datasetCompanyExample)
@example(newCompanyExample)
model CompanyResponse {
    ...CompanySummary;

    @doc("Признаки из датасета банка. Передаются только для компаний с origin = dataset.")
    bankData?: BankData;

    @doc("Сведения от пользователей во всех статусах, сначала новые. Пустой массив, если сведений нет.")
    facts: ProfileFactResponse[];

    @doc("Готовность аналитики.")
    analysis: CompanyAnalysis;
}
