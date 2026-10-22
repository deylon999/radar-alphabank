import "../../../common/model/Uuid.tsp";
import "./InsightEnums.tsp";
import "./BankView.tsp";

using AlfaHackathonApi.Domain;

namespace AlfaHackathonApi.Insights;

const insightBriefExample: InsightBrief = #{
    id: "9b1f3c5e-7a2d-4e6f-8b0c-1d3e5f7a9b2c",
    kind: "risk",
    urgency: "important",
    relevance: "direct",
    status: "new",
    title: "ЦБ сохранил ставку 14% и дал жёсткий сигнал: кредиты не подешевеют до конца года",
    updatedAt: utcDateTime.fromISO("2026-09-11T12:00:00Z")
};

const overviewResponseExample: OverviewResponse = #{
    topics: #[#{ topic: "financing", insights: #[insightBriefExample] }],
    materials: #[#{ material: policyRateMaterialExample, insights: #[insightBriefExample] }]
};

@doc("Краткая карточка вывода для обзора.")
@example(insightBriefExample)
model InsightBrief {
    @doc("ID вывода.")
    id: Uuid;

    @doc("Риск или возможность.")
    kind: InsightKind;

    @doc("Срочность.")
    urgency: Urgency;

    @doc("Связь с компанией.")
    relevance: Relevance;

    @doc("Состояние для текущего пользователя.")
    status: InsightStatus;

    @doc("Заголовок.")
    @minLength(1)
    title: string;

    @doc("Время последнего изменения содержимого.")
    updatedAt: utcDateTime;
}

@doc("Выводы одной темы.")
model TopicGroup {
    @doc("Тема.")
    topic: Topic;

    @doc("Выводы темы в порядке ленты.")
    @minItems(1)
    insights: InsightBrief[];
}

@doc("Выводы, опирающиеся на один материал банка.")
model MaterialGroup {
    @doc("Материал из позиции банка, без страницы.")
    material: BankMaterial;

    @doc("Выводы с позицией банка по этому материалу.")
    @minItems(1)
    insights: InsightBrief[];
}

@doc("""
    Все актуальные выводы компании для текущего пользователя в двух разрезах.
    Входят обе вкладки ленты, скрытые пользователем выводы — нет. Пустые группы не передаются.
    """)
@example(overviewResponseExample)
model OverviewResponse {
    @doc("""
        Темы, где есть выводы. Порядок: больше срочных рисков, затем больше рисков, затем больше выводов.
        Пустой массив, если выводов нет.
        """)
    topics: TopicGroup[];

    @doc("""
        Материалы банка, на которых построены позиции в выводах; прежние оценки из supersedes не учитываются.
        Сначала свежие, устаревшие в конце. Пустой массив, если таких выводов нет.
        """)
    materials: MaterialGroup[];
}
