namespace AlfaHackathonApi.Insights;

const answerResponseExample: AnswerResponse = #{
    question: "Что будет при ставке 12%?",
    answer: "При ставке 12% процентные расходы по плавающим кредитам снизятся примерно на седьмую часть. Банк ждёт такого уровня к концу 2027 года.",
    citations: #[
        #{ kind: "bank", label: "Ключевая ставка ЦБ РФ, 11.09.2026, с. 1" },
        #{ kind: "client", label: "Профиль клиента: кредиты, лизинг" },
        #{ kind: "news", label: "Банк России сохранил ключевую ставку", url: "https://example.com/news/key-rate" }
    ]
};

@doc("Вид источника ответа: news — новость, bank — аналитика Альфа-Банка, client — данные компании.")
union CitationKind {
    "news",
    "bank",
    "client",
}

@doc("Источник, на который опирается ответ.")
model Citation {
    @doc("Вид источника.")
    kind: CitationKind;

    @doc("Подпись источника.")
    @minLength(1)
    label: string;

    @doc("Ссылка на источник. Не передаётся, если у источника нет адреса.")
    url?: url;
}

@doc("Ответ на уточняющий вопрос.")
@example(answerResponseExample)
model AnswerResponse {
    @doc("Вопрос после обрезки пробелов.")
    @minLength(1)
    question: string;

    @doc("Ответ. На вопрос не по теме вывода — объяснение, что сервис отвечает только о выводе.")
    @minLength(1)
    answer: string;

    @doc("Источники ответа. Пустой массив, если ответ не опирается на источники, например на вопрос не по теме.")
    citations: Citation[];
}
