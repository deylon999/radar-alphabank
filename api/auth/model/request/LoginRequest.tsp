namespace AlfaHackathonApi.Auth;

const loginRequestExample: LoginRequest = #{
    email: "ivan@example.com",
    password: "My company has useful news"
};

@doc("Данные входа. Членство в компании сервер определяет сам и при входе не принимает.")
@example(loginRequestExample)
model LoginRequest {
    @doc("Email пользователя. Нормализация совпадает с регистрацией и ключом ограничения попыток.")
    @format("email")
    @minLength(1)
    @maxLength(254)
    email: string;

    @doc("Пароль пользователя. Не записывается в журналы.")
    @secret
    @minLength(1)
    @maxLength(255)
    password: string;
}
