import "../../../common/model/Position.tsp";

using AlfaHackathonApi.Domain;

namespace AlfaHackathonApi.Insights;

const askQuestionRequestExample: AskQuestionRequest = #{ question: "Что будет при ставке 12%?" };

@doc("Уточняющий вопрос по выводу.")
@example(askQuestionRequestExample)
model AskQuestionRequest {
    @doc("Вопрос. Пробелы по краям отбрасываются.")
    @minLength(1)
    @maxLength(500)
    question: string;

    @doc("Должность, с учётом которой готовится ответ. Не передаётся — берётся должность из членства. Прав не даёт.")
    role?: Position;
}
