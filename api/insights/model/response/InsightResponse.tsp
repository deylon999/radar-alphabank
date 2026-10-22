import "@typespec/openapi3";
import "../../../common/model/Uuid.tsp";
import "../../../common/model/CompanyId.tsp";
import "./InsightEnums.tsp";
import "./BankView.tsp";

using TypeSpec.OpenAPI;
using AlfaHackathonApi.Domain;

namespace AlfaHackathonApi.Insights;

const keyRateInsightExample: InsightResponse = #{
    id: "9b1f3c5e-7a2d-4e6f-8b0c-1d3e5f7a9b2c",
    companyId: "U_9250",
    kind: "risk",
    urgency: "important",
    relevance: "direct",
    status: "new",
    topic: "financing",
    title: "ЦБ сохранил ставку 14% и дал жёсткий сигнал: кредиты не подешевеют до конца года",
    whyItMatters: "У компании кредиты, лизинг и гарантии в Альфа-Банке — стоимость обслуживания долга останется высокой",
    event: #{
        title: "Совет директоров Банка России сохранил ключевую ставку 14,0%",
        stage: "decided",
        occurredAt: utcDateTime.fromISO("2026-09-11T10:30:00Z")
    },
    impactPath: #[
        #{ label: "Ключевая ставка 14%", role: "event" },
        #{ label: "Стоимость кредитов и лизинга", role: "market" },
        #{ label: "Клиент U_9250", role: "company" }
    ],
    consequence: "Процентные расходы по плавающим кредитам и лизингу не снизятся минимум до весны 2027 года",
    basis: #["Банк России 11 сентября сохранил ключевую ставку на уровне 14,0%"],
    unknowns: #["Доля долга с плавающей ставкой"],
    checks: #["Пересчитать бюджет процентных расходов на 4 квартал при ставке 14%"],
    sources: #[
        #{
            id: "news-cbr-2026-09-11",
            title: "Банк России сохранил ключевую ставку",
            publisher: "Официальные сообщения (тестовые данные)",
            url: "https://example.com/news/key-rate",
            publishedAt: utcDateTime.fromISO("2026-09-11T10:30:00Z")
        }
    ],
    createdAt: utcDateTime.fromISO("2026-09-11T12:00:00Z"),
    updatedAt: utcDateTime.fromISO("2026-09-11T12:00:00Z"),
    revisions: #[],
    bankView: bankViewExample,
    signals: #[
        #{ origin: "bank_data", label: "Продукты банка", value: "кредиты, лизинг, гарантии" },
        #{
            origin: "fact",
            factId: "4e7a9c2b-1d3f-4a5b-8c6d-7e8f9a0b1c2d",
            label: "Площадки и склады",
            value: "производственная база и склад техники в Иркутске"
        }
    ],
    trace: #[
        #{ kind: "plan", title: "Событие касается стоимости денег — нужны долговые продукты клиента" },
        #{ kind: "tool", title: "Профиль клиента", detail: "кредиты, лизинг, гарантии" },
        #{ kind: "tool", title: "Аналитика банка", detail: "2 материала о ставке" },
        #{ kind: "check", title: "Материалы расходятся — взят более свежий от 11 сентября" },
        #{ kind: "conclusion", title: "Риск: долговая нагрузка не снизится" }
    ],
    offer: #{
        title: "Хеджирование процентного риска",
        description: "Процентный своп фиксирует ставку по кредиту с плавающей ставкой",
        url: "https://example.com/alfa/irs"
    },
    suggestedQuestions: #["Что будет при ставке 12%?", "Когда банк ждёт снижения ставки?"]
};

@doc("Событие, которому посвящён вывод.")
model InsightEvent {
    @doc("Что произошло.")
    @minLength(1)
    title: string;

    @doc("Стадия события.")
    stage: EventStage;

    @doc("Когда произошло. Не передаётся, если дата неизвестна, например у обсуждаемого события.")
    occurredAt?: utcDateTime;

    @doc("Где произошло. Не передаётся, если место не важно или неизвестно.")
    place?: string;
}

@doc("Шаг цепочки влияния от события к компании.")
model ImpactStep {
    @doc("Подпись шага.")
    @minLength(1)
    label: string;

    @doc("Роль шага.")
    role: ImpactRole;
}

@doc("Новость или другой внешний источник вывода.")
model NewsSource {
    @doc("ID источника в базе новостей.")
    @minLength(1)
    id: string;

    @doc("Заголовок.")
    @minLength(1)
    title: string;

    @doc("Издатель.")
    @minLength(1)
    publisher: string;

    @doc("Ссылка на первоисточник.")
    url: url;

    @doc("Дата публикации.")
    publishedAt: utcDateTime;
}

@doc("""
    Признак компании, повлиявший на вывод. Происхождение указывается явно:
    bank_data — признак из данных банка, fact — подтверждённое сведение пользователей компании.
    """)
@oneOf
union ClientSignal {
    bankData: {
        @doc("Признак из данных банка.")
        origin: "bank_data";

        @doc("Название признака.")
        @minLength(1)
        label: string;

        @doc("Значение признака.")
        @minLength(1)
        value: string;
    },

    fact: {
        @doc("Подтверждённое сведение пользователей.")
        origin: "fact";

        @doc("ID факта из профиля компании.")
        factId: Uuid;

        @doc("Название признака.")
        @minLength(1)
        label: string;

        @doc("Значение признака.")
        @minLength(1)
        value: string;
    },
}

@doc("Вид шага агента: plan — план, tool — обращение к данным, check — самопроверка, conclusion — вывод.")
union TraceStepKind {
    "plan",
    "tool",
    "check",
    "conclusion",
}

@doc("Действительно выполненный шаг агента. Без внутренних промптов и служебных данных: его видит пользователь.")
model TraceStep {
    @doc("Вид шага.")
    kind: TraceStepKind;

    @doc("Что сделано.")
    @minLength(1)
    title: string;

    @doc("Существенный результат шага. Не передаётся, если его нет.")
    detail?: string;
}

@doc("Продукт банка, связанный с выводом. В интерфейсе подписывается как предложение банка.")
model BankOffer {
    @doc("Название продукта.")
    @minLength(1)
    title: string;

    @doc("Чем продукт помогает в этой ситуации.")
    @minLength(1)
    description: string;

    @doc("Страница продукта.")
    url: url;
}

@doc("Существенное обновление вывода.")
model InsightRevision {
    @doc("Время обновления.")
    at: utcDateTime;

    @doc("Что изменилось.")
    @minLength(1)
    note: string;
}

@doc("""
    Персонализированный вывод о событии для компании. Содержимое общее для участников компании,
    status — личный для текущего пользователя. Поля различаются по происхождению:
    event, basis, sources — факты; bankView — позиция банка; whyItMatters, impactPath, consequence, checks — вывод модели;
    signals — признаки компании; trace — шаги агента.
    """)
@example(keyRateInsightExample)
model InsightResponse {
    @doc("ID вывода.")
    id: Uuid;

    @doc("Компания, для которой сделан вывод.")
    companyId: CompanyId;

    @doc("Риск или возможность.")
    kind: InsightKind;

    @doc("Срочность.")
    urgency: Urgency;

    @doc("Связь с компанией.")
    relevance: Relevance;

    @doc("Состояние для текущего пользователя.")
    status: InsightStatus;

    @doc("Тема.")
    topic: Topic;

    @doc("Заголовок. Желательно до 90 символов: в ленте он обрезается после двух строк.")
    @minLength(1)
    title: string;

    @doc("Почему событие касается компании. Вывод модели.")
    @minLength(1)
    whyItMatters: string;

    @doc("Событие.")
    event: InsightEvent;

    @doc("Цепочка влияния из 2–6 шагов. Последний шаг всегда с ролью company.")
    @minItems(2)
    @maxItems(6)
    impactPath: ImpactStep[];

    @doc("Возможное последствие. Всегда гипотеза; оценки вероятности и уверенности модели не передаются.")
    @minLength(1)
    consequence: string;

    @doc("Только установленные факты.")
    basis: string[];

    @doc("Чего не известно. Может быть пустым.")
    unknowns: string[];

    @doc("Что стоит проверить. Может быть пустым.")
    checks: string[];

    @doc("Источники вывода. Минимум один.")
    @minItems(1)
    sources: NewsSource[];

    @doc("Время создания вывода.")
    createdAt: utcDateTime;

    @doc("Время последнего изменения содержимого. Смена личного статуса его не меняет.")
    updatedAt: utcDateTime;

    @doc("Существенные обновления, сначала старые. Пустой массив, если обновлений не было.")
    revisions: InsightRevision[];

    @doc("Позиция банка. Передаётся, только если по теме есть материал банка; модель её не придумывает.")
    bankView?: BankView;

    @doc("От 1 до 5 признаков компании, на которых построен вывод. Признаки, не повлиявшие на вывод, не передаются.")
    @minItems(1)
    @maxItems(5)
    signals: ClientSignal[];

    @doc("Шаги агента по порядку: план, обращения к данным, самопроверка, вывод.")
    @minItems(1)
    trace: TraceStep[];

    @doc("Предложение банка. Передаётся, только если продукт связан с выводом.")
    offer?: BankOffer;

    @doc("До 4 подсказок для вопроса по выводу. Пустой массив, если подсказок нет.")
    @maxItems(4)
    suggestedQuestions: string[];
}
