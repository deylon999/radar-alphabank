import "@typespec/openapi3";
import "../../../common/model/Uuid.tsp";
import "../../../insights/model/response/InsightEnums.tsp";
import "../../../insights/model/response/DigestResponse.tsp";

using TypeSpec.OpenAPI;
using AlfaHackathonApi.Domain;
using AlfaHackathonApi.Insights;

namespace AlfaHackathonApi.Bots;

const urgentDeliveryExample = #{
    id: "5c7e9a1b-3d5f-4b7c-9e1a-2b4c6d8e0f13",
    chatId: 123456789,
    kind: "urgent",
    insight: #{
        id: "9b1f3c5e-7a2d-4e6f-8b0c-1d3e5f7a9b2c",
        kind: "risk",
        urgency: "urgent",
        title: "Паводок в Заречном районе: вода подошла к складской зоне",
        whyItMatters: "Склад в зоне паводка — под угрозой поставка упаковки",
        checks: #["Запросить у склада статус отгрузки на сегодня и завтра"]
    }
};

const digestDeliveryExample = #{
    id: "7e9a1b3c-5d7f-4a9b-8c1d-3e5f7a9b1c24",
    chatId: 123456789,
    kind: "digest",
    digest: digestResponseExample
};

const deliveriesResponseExample: DeliveriesResponse = #{
    items: #[urgentDeliveryExample, digestDeliveryExample]
};

@doc("Срочный вывод в объёме, нужном для сообщения в мессенджере.")
model DeliveryInsight {
    @doc("ID вывода. Бот строит ссылку <адрес сайта>/insights/<id>.")
    id: Uuid;

    @doc("Риск или возможность.")
    kind: InsightKind;

    @doc("Срочность.")
    urgency: Urgency;

    @doc("Заголовок.")
    @minLength(1)
    title: string;

    @doc("Почему событие касается компании.")
    @minLength(1)
    whyItMatters: string;

    @doc("Что стоит проверить. Может быть пустым.")
    checks: string[];
}

@doc("Готовое к отправке уведомление. Вид определяется полем kind.")
@oneOf
union Delivery {
    urgent: {
        @doc("ID доставки. Бот отбрасывает повторы по нему.")
        id: Uuid;

        @doc("ID чата получателя.")
        chatId: int64;

        @doc("Срочный вывод.")
        kind: "urgent";

        @doc("Вывод для сообщения.")
        insight: DeliveryInsight;
    },

    digest: {
        @doc("ID доставки. Бот отбрасывает повторы по нему.")
        id: Uuid;

        @doc("ID чата получателя.")
        chatId: int64;

        @doc("Сводка.")
        kind: "digest";

        @doc("Сводка в том же виде, что GET /companies/{companyId}/digest.")
        digest: DigestResponse;
    },
}

@doc("Доставки для мессенджера этого бота.")
@example(deliveriesResponseExample)
model DeliveriesResponse {
    @doc("Доставки, сначала самые старые. Пустой массив, если отправлять нечего.")
    items: Delivery[];
}
