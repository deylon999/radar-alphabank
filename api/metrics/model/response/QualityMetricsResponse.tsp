import "../../../common/model/Uuid.tsp";
import "../../../insights/model/response/InsightEnums.tsp";

using AlfaHackathonApi.Domain;
using AlfaHackathonApi.Insights;

namespace AlfaHackathonApi.Metrics;

const qualityMetricsResponseExample: QualityMetricsResponse = #{
    generatedAt: utcDateTime.fromISO("2026-10-21T10:00:00Z"),
    insights: 21,
    engagement: #{ read: 7, dismissed: 1, questions: 4 },
    feedback: #{
        useful: 6,
        notUseful: 3,
        comments: #[
            #{
                insightId: "2c4e6a8b-0d1f-4a3b-8c5d-7e9f1a2b3c4d",
                insightTitle: "Металлопрокат дорожает третий месяц",
                useful: false,
                comment: "Оценка банка 2021 года, по стали нужно что-то свежее",
                at: utcDateTime.fromISO("2026-10-20T14:36:00Z")
            }
        ]
    },
    completeness: #{
        withBankView: 19,
        withSignals: 21,
        withSelfCheck: 9,
        withChecks: 21,
        outdatedBankView: 1
    },
    reactionMinutes: #{ median: 210, p90: 720 },
    topics: #[#{ topic: "financing", insights: 5, useful: 2, notUseful: 0, dismissed: 0 }],
    questions: #[
        #{
            insightId: "9b1f3c5e-7a2d-4e6f-8b0c-1d3e5f7a9b2c",
            insightTitle: "ЦБ сохранил ставку 14% и дал жёсткий сигнал: кредиты не подешевеют до конца года",
            question: "Что будет при ставке 12%?",
            at: utcDateTime.fromISO("2026-10-20T06:36:00Z")
        }
    ]
};

@doc("Работа пользователей с выводами.")
model QualityEngagement {
    @doc("Выводы, которые хотя бы один пользователь открыл и не скрыл: у него статус read.")
    @minValue(0)
    read: int32;

    @doc("Выводы, которые скрыл хотя бы один пользователь.")
    @minValue(0)
    dismissed: int32;

    @doc("Все заданные вопросы по выводам.")
    @minValue(0)
    questions: int32;
}

@doc("Комментарий к оценке вывода. Автор и компания не передаются.")
model QualityComment {
    @doc("ID вывода. Доступа к выводу не даёт.")
    insightId: Uuid;

    @doc("Заголовок вывода.")
    @minLength(1)
    insightTitle: string;

    @doc("Оценка, к которой оставлен комментарий.")
    useful: boolean;

    @doc("Текст комментария.")
    @minLength(1)
    comment: string;

    @doc("Время сохранения оценки.")
    at: utcDateTime;
}

@doc("Оценки выводов. У каждого пользователя одна текущая оценка вывода.")
model QualityFeedback {
    @doc("Текущие оценки «Полезно» по всем пользователям и выводам.")
    @minValue(0)
    useful: int32;

    @doc("Текущие оценки «Не полезно».")
    @minValue(0)
    notUseful: int32;

    @doc("До 10 последних оценок с комментарием, сначала новые. Пустой массив, если комментариев нет.")
    @maxItems(10)
    comments: QualityComment[];
}

@doc("Полнота выводов: сколько выводов содержит обязательные для кейса части.")
model QualityCompleteness {
    @doc("Выводы с позицией банка на неустаревшем материале.")
    @minValue(0)
    withBankView: int32;

    @doc("Выводы с признаками компании. Признаки обязательны, поэтому совпадает с insights; показатель оставлен для экрана.")
    @minValue(0)
    withSignals: int32;

    @doc("Выводы, в шагах агента которых есть самопроверка: шаг с kind = check.")
    @minValue(0)
    withSelfCheck: int32;

    @doc("Выводы с непустым списком «что проверить».")
    @minValue(0)
    withChecks: int32;

    @doc("Выводы с позицией банка на устаревшем материале.")
    @minValue(0)
    outdatedBankView: int32;
}

@doc("""
    Минуты от последнего сигнала до появления вывода. Сигнал — самый поздний из источников и материала банка,
    опубликованный не позже создания вывода. Перцентили по ближайшему рангу; 0, если данных нет.
    """)
model QualityReaction {
    @doc("Медиана.")
    @minValue(0)
    median: int32;

    @doc("90-й перцентиль.")
    @minValue(0)
    p90: int32;
}

@doc("Показатели одной темы.")
model QualityTopic {
    @doc("Тема.")
    topic: Topic;

    @doc("Выводов по теме.")
    @minValue(1)
    insights: int32;

    @doc("Текущие оценки «Полезно».")
    @minValue(0)
    useful: int32;

    @doc("Текущие оценки «Не полезно».")
    @minValue(0)
    notUseful: int32;

    @doc("Выводы темы, которые скрыл хотя бы один пользователь.")
    @minValue(0)
    dismissed: int32;
}

@doc("Вопрос пользователя по выводу. Автор и компания не передаются.")
model QualityQuestion {
    @doc("ID вывода. Доступа к выводу не даёт.")
    insightId: Uuid;

    @doc("Заголовок вывода.")
    @minLength(1)
    insightTitle: string;

    @doc("Текст вопроса.")
    @minLength(1)
    question: string;

    @doc("Время вопроса.")
    at: utcDateTime;
}

@doc("Метрики качества выводов по всем компаниям для команды и экспертов.")
@example(qualityMetricsResponseExample)
model QualityMetricsResponse {
    @doc("Время расчёта.")
    generatedAt: utcDateTime;

    @doc("Сколько выводов выдано. Счётчики выводов ниже не превышают это число.")
    @minValue(0)
    insights: int32;

    @doc("Работа с выводами.")
    engagement: QualityEngagement;

    @doc("Оценки пользователей.")
    feedback: QualityFeedback;

    @doc("Полнота выводов.")
    completeness: QualityCompleteness;

    @doc("Скорость реакции на события.")
    reactionMinutes: QualityReaction;

    @doc("Только темы, где есть выводы. Пустой массив, если выводов нет.")
    topics: QualityTopic[];

    @doc("До 10 последних вопросов, сначала новые. Пустой массив, если вопросов нет.")
    @maxItems(10)
    questions: QualityQuestion[];
}
