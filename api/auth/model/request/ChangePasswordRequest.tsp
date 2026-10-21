namespace AlfaHackathonApi.Auth;

const changePasswordRequestExample: ChangePasswordRequest = #{
    new_password: "Another long company passphrase"
};

@doc("Новый пароль после успешного повторного подтверждения личности.")
@example(changePasswordRequestExample)
model ChangePasswordRequest {
    @doc("Новый пароль из 15–255 символов. Распространённые и скомпрометированные пароли отклоняются.")
    @secret
    @minLength(15)
    @maxLength(255)
    new_password: string;
}
