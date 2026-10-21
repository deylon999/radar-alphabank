import "../../../common/model/Uuid.tsp";

using AlfaHackathonApi.Domain;

namespace AlfaHackathonApi.Auth;

const authenticatedUserExample: AuthenticatedUserResponse = #{
    id: "b95b680c-67b7-4d2e-bbd3-3b63d4cc7d61",
    email: "ivan@example.com",
    companyId: "fd470798-cdeb-4f5b-8522-b969f130f00e",
    twoFactorEnabled: false
};

@doc("Пользователь, определённый сервером после проверки учётных данных.")
@example(authenticatedUserExample)
model AuthenticatedUserResponse {
    @doc("ID пользователя.")
    id: Uuid;

    @doc("Email пользователя.")
    @format("email")
    email: string;

    @doc("ID единственной компании пользователя. Не является доказательством доступа в последующих запросах.")
    companyId: Uuid;

    @doc("Включена ли двухфакторная аутентификация.")
    twoFactorEnabled: boolean;
}
