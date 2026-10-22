namespace AlfaHackathonApi.Bots;

const confirmLinkRequestExample: ConfirmLinkRequest = #{
    code: "Ab3xK9pQr2Zt",
    chatId: 123456789,
    username: "demo_director"
};

@doc("Код из ссылки на бота и чат, который нужно привязать.")
@example(confirmLinkRequestExample)
model ConfirmLinkRequest {
    @doc("Код привязки из параметра start ссылки.")
    @secret
    @pattern("^[A-Za-z0-9]{12}$")
    code: string;

    @doc("ID чата с пользователем в мессенджере.")
    chatId: int64;

    @doc("Имя пользователя в мессенджере без @. Не передаётся, если его нет.")
    @minLength(1)
    username?: string;
}
