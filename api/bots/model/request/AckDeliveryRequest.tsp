namespace AlfaHackathonApi.Bots;

const sentAckRequestExample: AckDeliveryRequest = #{ status: "sent" };
const failedAckRequestExample: AckDeliveryRequest = #{ status: "failed", error: "Мессенджер вернул 500 после трёх повторов" };

@doc("Итог доставки.")
@example(sentAckRequestExample)
@example(failedAckRequestExample)
model AckDeliveryRequest {
    @doc("""
        sent — мессенджер принял сообщение; blocked — пользователь заблокировал бота, привязка снимается;
        failed — другая ошибка после всех повторов бота.
        """)
    status: "sent" | "blocked" | "failed";

    @doc("Причина неудачи для журналов. Передаётся только при failed. Без токенов и персональных данных.")
    @minLength(1)
    @maxLength(500)
    error?: string;
}
