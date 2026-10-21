import "../../../common/model/Uuid.tsp";
import "./ProfileFactResponse.tsp";

using AlfaHackathonApi.Domain;

namespace AlfaHackathonApi.Facts;

const processingExtractionExample: ExtractionResponse = #{
    id: "f1e2d3c4-b5a6-4978-8a9b-0c1d2e3f4a5b",
    status: "processing",
    sources: #[textSourceExample, linkSourceExample],
    createdAt: utcDateTime.fromISO("2026-10-18T13:00:00Z")
};

const completedExtractionExample: ExtractionResponse = #{
    ...processingExtractionExample,
    status: "completed",
    completedAt: utcDateTime.fromISO("2026-10-18T13:00:20Z"),
    facts: #[pendingFactExample],
    incompleteSources: #[linkSourceExample]
};

const failedExtractionExample: ExtractionResponse = #{
    ...processingExtractionExample,
    status: "failed",
    completedAt: utcDateTime.fromISO("2026-10-18T13:00:30Z"),
    failure: #{
        code: "AI_UNAVAILABLE",
        description: "Сервис анализа временно недоступен. Попробуйте позже."
    }
};

@doc("""
    Состояние извлечения. processing — идёт обработка; completed — завершено, новые факты добавлены;
    failed — фактов не добавлено, причина в failure.
    """)
union ExtractionStatus {
    "processing",
    "completed",
    "failed",
}

@doc("Причина неудачного извлечения.")
model ExtractionFailure {
    @doc("""
        Машинный код. SOURCES_UNAVAILABLE — ни один источник не удалось прочитать;
        AI_UNAVAILABLE — модель недоступна или исчерпан лимит её использования; PROCESSING_FAILED — другая ошибка.
        """)
    code: "SOURCES_UNAVAILABLE" | "AI_UNAVAILABLE" | "PROCESSING_FAILED";

    @doc("Описание для пользователя без технических подробностей.")
    description: string;
}

@doc("Фоновое извлечение фактов из описания, ссылок или документов.")
@example(processingExtractionExample)
@example(completedExtractionExample)
model ExtractionResponse {
    @doc("ID извлечения.")
    id: Uuid;

    @doc("Состояние.")
    status: ExtractionStatus;

    @doc("Переданные источники в порядке запроса.")
    @minItems(1)
    sources: FactSource[];

    @doc("Время приёма запроса.")
    createdAt: utcDateTime;

    @doc("Время завершения. Не передаётся, пока идёт обработка.")
    completedAt?: utcDateTime;

    @doc("""
        Добавленные факты в статусе pending. Передаётся только при completed; пустой массив, если новых фактов нет.
        Факты, которые у компании уже есть в любом статусе, повторно не добавляются.
        """)
    facts?: ProfileFactResponse[];

    @doc("""
        Источники, учтённые не полностью: ссылка недоступна или документ обработан частично.
        Передаётся только при completed, если такие есть.
        """)
    incompleteSources?: FactSource[];

    @doc("Причина неудачи. Передаётся только при failed.")
    failure?: ExtractionFailure;
}
