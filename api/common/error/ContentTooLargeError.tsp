import "./ProblemResponse.tsp";

namespace AlfaHackathonApi.Errors;

const contentTooLargeExample: ContentTooLargeError = #{
    statusCode: 413,
    contentType: "application/problem+json",
    cacheControl: "no-store",
    body: #{
        type: "/problems/content-too-large",
        title: "Слишком большой запрос",
        status: 413,
        detail: "Общий размер запроса превышает допустимый."
    }
};

const contentTooLargeOperationExample = #{ returnType: contentTooLargeExample };

@error
@doc("Ошибка: тело запроса больше допустимого. Сервер может прервать чтение, не дожидаясь конца загрузки.")
@example(contentTooLargeExample)
model ContentTooLargeError is ProblemResponse<413>;
