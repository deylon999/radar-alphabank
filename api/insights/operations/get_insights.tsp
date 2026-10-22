import "@typespec/http";

import "../model/response/InsightsResponse.tsp";
import "../model/error/InsightErrors.tsp";
import "../../companies/model/error/CompanyErrors.tsp";

import "../../common";

using TypeSpec.Http;
using AlfaHackathonApi.Security;
using AlfaHackathonApi.Domain;
using AlfaHackathonApi.Errors;
using AlfaHackathonApi.Companies.Errors;
using AlfaHackathonApi.Insights.Errors;

namespace AlfaHackathonApi.Insights;

const getInsightsFirstPageOperationExample = #{
    parameters: #{ companyId: "U_9250", kind: #["risk", "opportunity"], relevance: "direct" },
    returnType: #{
        statusCode: 200,
        contentType: "application/json",
        cacheControl: "no-store",
        body: insightsPageExample
    }
};

const getInsightsNextPageOperationExample = #{
    parameters: #{
        companyId: "U_9250",
        kind: #["risk", "opportunity"],
        relevance: "direct",
        cursor: "eyJrIjoiOWIxZjNjNWUifQ"
    },
    returnType: #{
        statusCode: 200,
        contentType: "application/json",
        cacheControl: "no-store",
        body: insightsLastPageExample
    }
};

const getInsightsEmptyOperationExample = #{
    parameters: #{ companyId: "3f6b8c2e-5d41-4a7e-9c0b-2e8f1a6d4b93" },
    returnType: #{
        statusCode: 200,
        contentType: "application/json",
        cacheControl: "no-store",
        body: #{ items: #[], nextCursor: null }
    }
};

@get
@route("/companies/{companyId}/insights")
@summary("Лента выводов")
@doc("""
    Доступно любому участнику компании. Выводы общие для компании, status — личный для текущего пользователя.
    Скрытые пользователем выводы не попадают в ленту.
    Значения одного фильтра объединяются через «или», разные фильтры — через «и». Неизвестное значение фильтра — 400.
    Порядок: сначала срочные; внутри группы выше то, что важнее для должности: role из запроса, а без него — из членства;
    затем по updatedAt, новые выше; при равенстве — по id. Для одного пользователя и одних данных порядок одинаков.
    Размер страницы задаёт сервер. Курсор привязан к фильтрам и к последнему элементу страницы,
    поэтому скрытие и новые выводы не приводят к пропускам и повторам.
    Если аналитика ещё не готова, лента пустая или содержит уже готовые выводы; состояние сообщает профиль компании.
    """)
@returnsDoc("Страница ленты.")
@opExample(getInsightsFirstPageOperationExample)
@opExample(getInsightsNextPageOperationExample)
@opExample(getInsightsEmptyOperationExample)
@opExample(badRequestOperationExample)
@opExample(invalidCursorOperationExample)
@opExample(insightsValidationOperationExample)
@opExample(unauthorizedOperationExample)
@opExample(companyMembershipRequiredOperationExample)
@opExample(companyNotFoundOperationExample)
op getInsights(
    @doc("ID компании.")
    @path companyId: CompanyId,

    @doc("Риски, возможности или оба вида. Повторяется: ?kind=risk&kind=opportunity.")
    @query(#{ explode: true })
    kind?: InsightKind[],

    @doc("Срочность. Повторяется.")
    @query(#{ explode: true })
    urgency?: Urgency[],

    @doc("Стадия события. Повторяется.")
    @query(#{ explode: true })
    stage?: EventStage[],

    @doc("Вкладка: direct — «Главное», possible — «Под наблюдением». Одно значение; без параметра — обе вкладки.")
    @query
    relevance?: Relevance,

    @doc("Поиск по заголовку, объяснению связи, событию, месту и шагам цепочки. Пустая строка равна отсутствию параметра.")
    @query
    @maxLength(200)
    q?: string,

    @doc("""
        Должность, для которой ранжировать ленту. Не передаётся — берётся должность из членства.
        Влияет только на порядок и прав не даёт.
        """)
    @query
    role?: Position,

    @doc("nextCursor из предыдущей страницы того же запроса.")
    @query
    @minLength(1)
    cursor?: string
):
    AlfaHackathonApi.Ok.OkResponse<InsightsResponse>
    | BadRequestError<ProblemDetails<400> | InvalidCursorDetails>
    | ValidationError<InsightsValidationIssue>
    | UnauthorizedError
    | ForbiddenError<CompanyMembershipRequiredDetails>
    | NotFoundError<CompanyNotFoundDetails>;
