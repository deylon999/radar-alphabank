namespace AlfaHackathonApi.Bots;

const unlinkChatRequestExample: UnlinkChatRequest = #{ chatId: 123456789 };

@doc("Чат, который нужно отвязать.")
@example(unlinkChatRequestExample)
model UnlinkChatRequest {
    @doc("ID чата в мессенджере.")
    chatId: int64;
}
