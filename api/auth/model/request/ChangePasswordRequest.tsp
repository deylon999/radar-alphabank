namespace AlfaHackathonApi.Auth;

const changePasswordRequestExample: ChangePasswordRequest = #{
    newPassword: "Another long company passphrase"
};

@doc("Новый пароль после успешного повторного подтверждения личности.")
@example(changePasswordRequestExample)
model ChangePasswordRequest {
    @doc("Новый пароль из 15–255 символов. Распространённые и скомпрометированные пароли отклоняются.")
    @secret
    @minLength(15)
    @maxLength(255)
    newPassword: string;
}
