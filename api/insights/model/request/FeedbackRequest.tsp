namespace AlfaHackathonApi.Insights;

const usefulFeedbackRequestExample: FeedbackRequest = #{ useful: true };

const commentedFeedbackRequestExample: FeedbackRequest = #{
    useful: false,
    comment: "Оценка банка 2021 года, по стали нужно что-то свежее"
};

@doc("Оценка вывода текущим пользователем.")
@example(usefulFeedbackRequestExample)
@example(commentedFeedbackRequestExample)
model FeedbackRequest {
    @doc("Полезен ли вывод.")
    useful: boolean;

    @doc("Комментарий. Пробелы по краям отбрасываются. Не передаётся, если комментария нет.")
    @minLength(1)
    @maxLength(2000)
    comment?: string;
}
