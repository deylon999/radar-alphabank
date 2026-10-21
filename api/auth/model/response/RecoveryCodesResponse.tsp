namespace AlfaHackathonApi.Auth;

const recoveryCodesResponseExample: RecoveryCodesResponse = #{
    recovery_codes: #[
        "7e719de3-09189305-52a5628d-8d872e45",
        "bf8e4f63-459c1aac-f83ce9e4-8ecb4c54"
    ]
};

@doc("Новый набор одноразовых резервных кодов. Показывается только при создании.")
@example(recoveryCodesResponseExample)
model RecoveryCodesResponse {
    @doc("Коды для сохранения пользователем. На сервере хранятся только хеши; новый набор отменяет предыдущий.")
    @minItems(1)
    recovery_codes: string[];
}
