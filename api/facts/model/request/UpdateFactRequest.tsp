import "../response/ProfileFactResponse.tsp";

namespace AlfaHackathonApi.Facts;

const confirmFactRequestExample: UpdateFactRequest = #{ status: "confirmed" };

const correctFactRequestExample: UpdateFactRequest = #{
    status: "confirmed",
    statement: "Спецтехнику закупаем у производителей из Китая и Беларуси."
};

const restoreFactRequestExample: UpdateFactRequest = #{ status: "pending" };

@doc("Изменение факта. Нужно передать status, statement или оба.")
@example(confirmFactRequestExample)
@example(correctFactRequestExample)
model UpdateFactRequest {
    @doc("Новая оценка. Допустим любой переход, в том числе возврат к pending при отмене действия.")
    status?: FactStatus;

    @doc("Исправленная формулировка. Исправленный факт всегда подтверждён: status, если передан, должен быть confirmed.")
    @minLength(1)
    @maxLength(1000)
    statement?: string;
}
