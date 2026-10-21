namespace AlfaHackathonApi.Auth;

const csrfResponseExample: CsrfResponse = #{
    token: "8cc5dfe6-47f8-48e8-a1a0-c4b8c6b279f1",
    headerName: "X-CSRF-TOKEN"
};

@doc("CSRF-токен для текущей анонимной или аутентифицированной сессии.")
@example(csrfResponseExample)
model CsrfResponse {
    @doc("Непрозрачное значение для заголовка. Не помещается в URL и журналы.")
    @minLength(1)
    token: string;

    @doc("Название заголовка для изменяющих запросов.")
    headerName: "X-CSRF-TOKEN";
}
