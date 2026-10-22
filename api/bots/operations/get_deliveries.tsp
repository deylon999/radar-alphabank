import "@typespec/http";

import "../model/response/DeliveriesResponse.tsp";
import "../model/error/BotErrors.tsp";

import "../../common";

using TypeSpec.Http;
using AlfaHackathonApi.Security;
using AlfaHackathonApi.Domain;
using AlfaHackathonApi.Errors;
using AlfaHackathonApi.Bots.Errors;

namespace AlfaHackathonApi.Bots;

const getDeliveriesSuccessOperationExample = #{
    parameters: #{ limit: 50 },
    returnType: #{
        statusCode: 200,
        contentType: "application/json",
        cacheControl: "no-store",
        body: deliveriesResponseExample
    }
};

@get
@route("/deliveries")
@summary("Доставки для отправки")
@doc("""
    Бот опрашивает раз в 10–15 секунд, публичный адрес ему не нужен. Возвращает доставки только для мессенджера этого бота.
    Кому и что отправить, решает сервер по настройкам пользователя. Перед выдачей он заново проверяет,
    что чат привязан, пользователь состоит в компании вывода и не скрыл вывод; иначе доставка отменяется.
    Доставка без подтверждения через ack может прийти снова, поэтому бот отбрасывает повторы по id.
    """)
@returnsDoc("Доставки, сначала самые старые.")
@opExample(getDeliveriesSuccessOperationExample)
@opExample(badRequestOperationExample)
@opExample(botValidationOperationExample)
@opExample(invalidBotTokenOperationExample)
op getDeliveries(
    @doc("Сколько доставок вернуть, от 1 до 100. По умолчанию 50.")
    @query
    @minValue(1)
    @maxValue(100)
    limit?: int32 = 50
):
    AlfaHackathonApi.Ok.OkResponse<DeliveriesResponse>
    | BadRequestError
    | ValidationError<BotValidationIssue>
    | UnauthorizedError<InvalidBotTokenDetails>;
