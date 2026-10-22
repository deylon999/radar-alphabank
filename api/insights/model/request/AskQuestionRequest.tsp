namespace AlfaHackathonApi.Insights;

const askQuestionRequestExample: AskQuestionRequest = #{ question: "Что будет при ставке 12%?" };

@doc("Уточняющий вопрос по выводу. Должность берётся из членства пользователя.")
@example(askQuestionRequestExample)
model AskQuestionRequest {
    @doc("Вопрос. Пробелы по краям отбрасываются.")
    @minLength(1)
    @maxLength(500)
    question: string;
}
