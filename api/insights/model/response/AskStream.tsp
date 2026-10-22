import "@typespec/http";
import "./InsightResponse.tsp";
import "./AnswerResponse.tsp";

using TypeSpec.Http;

namespace AlfaHackathonApi.Insights;

const askStreamExample = "event: step\ndata: {\"kind\":\"plan\",\"title\":\"Разбираю вопрос: нужны аналитика банка и данные компании\"}\n\nevent: step\ndata: {\"kind\":\"tool\",\"title\":\"Аналитика банка\",\"detail\":\"Ключевая ставка ЦБ РФ, 11.09.2026\"}\n\nevent: step\ndata: {\"kind\":\"check\",\"title\":\"Сверяю ответ с источниками\"}\n\nevent: answer\ndata: {\"question\":\"Что будет при ставке 12%?\",\"answer\":\"При ставке 12% процентные расходы по плавающим кредитам снизятся примерно на седьмую часть.\",\"citations\":[{\"kind\":\"bank\",\"label\":\"Ключевая ставка ЦБ РФ, 11.09.2026, с. 1\"}]}\n\n";

const askStreamErrorExample = "event: step\ndata: {\"kind\":\"plan\",\"title\":\"Разбираю вопрос: нужны аналитика банка и данные компании\"}\n\nevent: error\ndata: {\"type\":\"/problems/ai-unavailable\",\"title\":\"Сервис анализа недоступен\",\"detail\":\"Не удалось подготовить ответ. Попробуйте позже.\"}\n\n";

@doc("""
    Ошибка, возникшая после начала потока. HTTP-статус уже 200, поэтому поля status нет.
    ai-unavailable — модель недоступна или исчерпан лимит её использования;
    answer-timeout — ответ не подготовлен за 60 секунд; answer-failed — другая ошибка.
    """)
model AskStreamError {
    @doc("Тип проблемы. Клиент различает случаи по нему.")
    type: "/problems/ai-unavailable" | "/problems/answer-timeout" | "/problems/answer-failed";

    @doc("Краткое название.")
    title: string;

    @doc("Пояснение для пользователя.")
    detail?: string;
}

@doc("""
    Поток Server-Sent Events. События идут в таком порядке:
    ноль или больше событий step, затем ровно одно завершающее событие answer или error; после него поток закрывается.
    step — данные TraceStep: настоящий шаг агента в момент, когда он выполнен;
    answer — данные AnswerResponse; error — данные AskStreamError.
    Сервер может присылать строки-комментарии, начинающиеся с двоеточия, чтобы соединение не закрылось; клиент их игнорирует.
    """)
model AskStreamResponse {
    @statusCode
    statusCode: 200;

    @header("Content-Type")
    contentType: "text/event-stream";

    @header("Cache-Control")
    cacheControl: "no-store";

    @doc("События в формате text/event-stream.")
    @body
    body: string;
}
