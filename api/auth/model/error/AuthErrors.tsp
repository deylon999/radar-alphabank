import "../../../common/error/UnauthorizedError.tsp";
import "../../../common/error/ConflictError.tsp";

using AlfaHackathonApi.Errors;

namespace AlfaHackathonApi.Auth.Errors;

@doc("Логин или пароль не прошли проверку. Причина не раскрывает существование аккаунта.")
model InvalidCredentialsDetails {
    ...OmitProperties<ProblemDetails<401>, "type">;
    type: "/problems/invalid-credentials";
}

@doc("Нет незавершённого входа, либо его пятиминутный срок истёк.")
model PendingLoginRequiredDetails {
    ...OmitProperties<ProblemDetails<401>, "type">;
    type: "/problems/pending-login-required";
}

@doc("Второй фактор неверен, истёк или уже использован.")
model InvalidSecondFactorDetails {
    ...OmitProperties<ProblemDetails<401>, "type">;
    type: "/problems/invalid-second-factor";
}

@doc("Повторная проверка личности не пройдена. Действующий вход сам по себе не завершается.")
model InvalidReauthenticationDetails {
    ...OmitProperties<ProblemDetails<401>, "type">;
    type: "/problems/invalid-reauthentication";
}

@doc("Email уже используется.")
model EmailAlreadyExistsDetails {
    ...OmitProperties<ProblemDetails<409>, "type">;
    type: "/problems/email-already-exists";
}

@doc("TOTP уже включён; новая первоначальная настройка не допускается.")
model TwoFactorAlreadyEnabledDetails {
    ...OmitProperties<ProblemDetails<409>, "type">;
    type: "/problems/two-factor-already-enabled";
}

@doc("Операция требует включённой 2FA.")
model TwoFactorNotEnabledDetails {
    ...OmitProperties<ProblemDetails<409>, "type">;
    type: "/problems/two-factor-not-enabled";
}

@doc("В текущей сессии нет действующей настройки TOTP.")
model TotpSetupExpiredDetails {
    ...OmitProperties<ProblemDetails<409>, "type">;
    type: "/problems/totp-setup-expired";
}

const invalidCredentialsExample: UnauthorizedError<InvalidCredentialsDetails> = #{
    statusCode: 401,
    contentType: "application/problem+json",
    cacheControl: "no-store",
    body: #{
        type: "/problems/invalid-credentials",
        title: "Неверные учётные данные",
        status: 401,
        detail: "Неверный email или пароль."
    }
};

const invalidCredentialsOperationExample = #{ returnType: invalidCredentialsExample };

const pendingLoginRequiredExample: UnauthorizedError<PendingLoginRequiredDetails> = #{
    statusCode: 401,
    contentType: "application/problem+json",
    cacheControl: "no-store",
    body: #{
        type: "/problems/pending-login-required",
        title: "Нет незавершённого входа",
        status: 401,
        detail: "Введите email и пароль заново, чтобы начать вход."
    }
};

const pendingLoginRequiredOperationExample = #{ returnType: pendingLoginRequiredExample };

const invalidSecondFactorExample: UnauthorizedError<InvalidSecondFactorDetails> = #{
    statusCode: 401,
    contentType: "application/problem+json",
    cacheControl: "no-store",
    body: #{
        type: "/problems/invalid-second-factor",
        title: "Неверный второй фактор",
        status: 401,
        detail: "Проверка второго фактора не пройдена."
    }
};

const invalidSecondFactorOperationExample = #{ returnType: invalidSecondFactorExample };

const invalidReauthenticationExample: UnauthorizedError<InvalidReauthenticationDetails> = #{
    statusCode: 401,
    contentType: "application/problem+json",
    cacheControl: "no-store",
    body: #{
        type: "/problems/invalid-reauthentication",
        title: "Подтверждение не пройдено",
        status: 401,
        detail: "Не удалось подтвердить личность."
    }
};

const invalidReauthenticationOperationExample = #{ returnType: invalidReauthenticationExample };

const emailAlreadyExistsExample: ConflictError<EmailAlreadyExistsDetails> = #{
    statusCode: 409,
    contentType: "application/problem+json",
    cacheControl: "no-store",
    body: #{
        type: "/problems/email-already-exists",
        title: "Email уже занят",
        status: 409,
        detail: "Пользователь с таким email уже существует."
    }
};

const emailAlreadyExistsOperationExample = #{ returnType: emailAlreadyExistsExample };

const twoFactorAlreadyEnabledExample: ConflictError<TwoFactorAlreadyEnabledDetails> = #{
    statusCode: 409,
    contentType: "application/problem+json",
    cacheControl: "no-store",
    body: #{
        type: "/problems/two-factor-already-enabled",
        title: "2FA уже включена",
        status: 409,
        detail: "Чтобы настроить новый фактор, сначала отключите текущий."
    }
};

const twoFactorAlreadyEnabledOperationExample = #{ returnType: twoFactorAlreadyEnabledExample };

const twoFactorNotEnabledExample: ConflictError<TwoFactorNotEnabledDetails> = #{
    statusCode: 409,
    contentType: "application/problem+json",
    cacheControl: "no-store",
    body: #{
        type: "/problems/two-factor-not-enabled",
        title: "2FA не включена",
        status: 409,
        detail: "Для этой операции нужно включить 2FA."
    }
};

const twoFactorNotEnabledOperationExample = #{ returnType: twoFactorNotEnabledExample };

const totpSetupExpiredExample: ConflictError<TotpSetupExpiredDetails> = #{
    statusCode: 409,
    contentType: "application/problem+json",
    cacheControl: "no-store",
    body: #{
        type: "/problems/totp-setup-expired",
        title: "Настройка TOTP истекла",
        status: 409,
        detail: "Начните настройку TOTP заново в текущей сессии."
    }
};

const totpSetupExpiredOperationExample = #{ returnType: totpSetupExpiredExample };
