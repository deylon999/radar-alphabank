import "@typespec/http";

import "../model/request/AckDeliveryRequest.tsp";
import "../model/error/BotErrors.tsp";

import "../../common";

using TypeSpec.Http;
using AlfaHackathonApi.Security;
using AlfaHackathonApi.Domain;
using AlfaHackathonApi.Errors;
using AlfaHackathonApi.Bots.Errors;

namespace AlfaHackathonApi.Bots;

const ackDeliverySuccessOperationExample = #{
    parameters: #{ deliveryId: "5c7e9a1b-3d5f-4b7c-9e1a-2b4c6d8e0f13", body: sentAckRequestExample },
    returnType: #{
        statusCode: 204,
        cacheControl: "no-store"
    }
};

@post
@route("/deliveries/{deliveryId}/ack")
@summary("Итог доставки")
@doc("""
    sent — доставка больше не выдаётся. blocked — сервер снимает привязку чата, как при отвязке.
    failed — сервер решает, повторить доставку позже или отменить её.
    Повторы при ошибках мессенджера бот делает сам до отправки ack. Повторный ack той же доставки ничего не меняет.
    """)
@returnsDoc("Итог сохранён.")
@opExample(ackDeliverySuccessOperationExample)
@opExample(badRequestOperationExample)
@opExample(botValidationOperationExample)
@opExample(invalidBotTokenOperationExample)
@opExample(deliveryNotFoundOperationExample)
op ackDelivery(
    @doc("ID доставки.")
    @path deliveryId: Uuid,

    @body body: AckDeliveryRequest
):
    AlfaHackathonApi.Ok.NoContentResponse
    | BadRequestError
    | ValidationError<BotValidationIssue>
    | UnauthorizedError<InvalidBotTokenDetails>
    | NotFoundError<DeliveryNotFoundDetails>;
