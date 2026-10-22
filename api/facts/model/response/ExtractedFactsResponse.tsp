import "./ProfileFactResponse.tsp";

namespace AlfaHackathonApi.Facts;

const extractedFactsResponseExample: ExtractedFactsResponse = #{
    facts: #[pendingFactExample],
    incompleteSources: #[linkSourceExample]
};

const noNewFactsResponseExample: ExtractedFactsResponse = #{ facts: #[] };

@doc("Результат извлечения фактов из описания, ссылок или документов.")
@example(extractedFactsResponseExample)
@example(noNewFactsResponseExample)
model ExtractedFactsResponse {
    @doc("""
        Новые факты в статусе pending; они же появляются в профиле компании. Пустой массив, если новых фактов нет.
        Факты, которые у компании уже есть в любом статусе, повторно не добавляются.
        """)
    facts: ProfileFactResponse[];

    @doc("Источники, учтённые не полностью: ссылка недоступна или документ обработан частично. Не передаётся, если всё учтено.")
    incompleteSources?: FactSource[];
}
