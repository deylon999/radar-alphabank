namespace AlfaHackathonApi.Auth;

const registerRequestExample: RegisterRequest = #{
    email: "ivan@example.com",
    password: "My company has useful news"
};

@doc("Данные регистрации. Идентификаторы пользователя и его компании назначает сервер.")
@example(registerRequestExample)
model RegisterRequest {
    @doc("Уникальный email пользователя.")
    @format("email")
    @minLength(1)
    @maxLength(254)
    email: string;

    @doc("Пароль из 15–255 символов. Разрешены пробелы, Unicode и вставка. Распространённые и скомпрометированные пароли отклоняются.")
    @secret
    @minLength(15)
    @maxLength(255)
    password: string;
}
