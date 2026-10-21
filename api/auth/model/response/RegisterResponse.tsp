import "../../../common/model/Uuid.tsp";

using AlfaHackathonApi.Domain;

namespace AlfaHackathonApi.Auth;

const registerResponseExample: RegisterResponse = #{
    id: "b95b680c-67b7-4d2e-bbd3-3b63d4cc7d61",
    companyId: "fd470798-cdeb-4f5b-8522-b969f130f00e"
};

@doc("Идентификаторы созданного пользователя и назначенной ему компании. Вход ещё не выполнен.")
@example(registerResponseExample)
model RegisterResponse {
    @doc("ID созданного пользователя.")
    id: Uuid;

    @doc("ID компании, созданной сервером при регистрации. Данные её профиля заполняются отдельно.")
    companyId: Uuid;
}
