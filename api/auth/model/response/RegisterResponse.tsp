import "../../../common/model/Uuid.tsp";

using AlfaHackathonApi.Domain;

namespace AlfaHackathonApi.Auth;

const registerResponseExample: RegisterResponse = #{
    id: "b95b680c-67b7-4d2e-bbd3-3b63d4cc7d61"
};

@doc("Идентификатор созданного пользователя. Вход ещё не выполнен, в компании пользователь пока не состоит.")
@example(registerResponseExample)
model RegisterResponse {
    @doc("ID созданного пользователя.")
    id: Uuid;
}
