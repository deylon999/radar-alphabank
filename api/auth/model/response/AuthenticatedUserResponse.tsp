import "../../../common/model/Uuid.tsp";

using AlfaHackathonApi.Domain;

namespace AlfaHackathonApi.Auth;

const authenticatedUserExample: AuthenticatedUserResponse = #{
    id: "b95b680c-67b7-4d2e-bbd3-3b63d4cc7d61",
    email: "ivan@example.com",
    twoFactorEnabled: false
};

@doc("Пользователь, определённый сервером после проверки учётных данных. Членство в компании возвращает GET /me.")
@example(authenticatedUserExample)
model AuthenticatedUserResponse {
    @doc("ID пользователя.")
    id: Uuid;

    @doc("Email пользователя.")
    @format("email")
    email: string;

    @doc("Включена ли двухфакторная аутентификация.")
    twoFactorEnabled: boolean;
}
