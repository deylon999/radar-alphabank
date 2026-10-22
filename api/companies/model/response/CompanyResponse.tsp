import "./CompanySummary.tsp";
import "./ClientProfile.tsp";
import "../../../facts/model/response/ProfileFactResponse.tsp";

using AlfaHackathonApi.Facts;

namespace AlfaHackathonApi.Companies;

const datasetCompanyExample: CompanyResponse = #{
    ...datasetCompanySummaryExample,
    industry: "Строительство прочих инженерных сооружений, не включённых в другие группировки",
    description: "Строим дороги, мосты и инженерные сети в Иркутской области. Спецтехнику закупаем в Китае.",
    profile: clientProfileExample,
    facts: #[pendingFactExample, confirmedFactExample],
    analysis: #{ status: "ready" }
};

const newCompanyExample: CompanyResponse = #{
    ...userCompanySummaryExample,
    description: "",
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
    profile и industry приходят из датасета, description и facts — от пользователей и не становятся данными банка.
    """)
@example(datasetCompanyExample)
@example(newCompanyExample)
model CompanyResponse {
    ...CompanySummary;

    @doc("Основной вид деятельности, наименование ОКВЭД из датасета. Не передаётся, если данных банка нет.")
    industry?: string;

    @doc("Последнее описание компании своими словами от её пользователей. Не данные банка. Пустая строка, если описания нет.")
    description: string;

    @doc("Признаки из датасета банка. Передаются только для компаний с origin = dataset.")
    profile?: ClientProfile;

    @doc("Сведения от пользователей во всех статусах, сначала новые. Пустой массив, если сведений нет.")
    facts: ProfileFactResponse[];

    @doc("Готовность аналитики.")
    analysis: CompanyAnalysis;
}
