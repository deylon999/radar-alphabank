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
        title: "Invalid credentials",
        status: 401,
        detail: "Email or password is incorrect."
    }
};

const invalidCredentialsOperationExample = #{ returnType: invalidCredentialsExample };

const pendingLoginRequiredExample: UnauthorizedError<PendingLoginRequiredDetails> = #{
    statusCode: 401,
    contentType: "application/problem+json",
    cacheControl: "no-store",
    body: #{
        type: "/problems/pending-login-required",
        title: "Pending login required",
        status: 401,
        detail: "Submit your email and password again to start a new login."
    }
};

const pendingLoginRequiredOperationExample = #{ returnType: pendingLoginRequiredExample };

const invalidSecondFactorExample: UnauthorizedError<InvalidSecondFactorDetails> = #{
    statusCode: 401,
    contentType: "application/problem+json",
    cacheControl: "no-store",
    body: #{
        type: "/problems/invalid-second-factor",
        title: "Invalid second factor",
        status: 401,
        detail: "The second-factor verification failed."
    }
};

const invalidSecondFactorOperationExample = #{ returnType: invalidSecondFactorExample };

const invalidReauthenticationExample: UnauthorizedError<InvalidReauthenticationDetails> = #{
    statusCode: 401,
    contentType: "application/problem+json",
    cacheControl: "no-store",
    body: #{
        type: "/problems/invalid-reauthentication",
        title: "Reauthentication failed",
        status: 401,
        detail: "The identity verification failed."
    }
};

const invalidReauthenticationOperationExample = #{ returnType: invalidReauthenticationExample };

const emailAlreadyExistsExample: ConflictError<EmailAlreadyExistsDetails> = #{
    statusCode: 409,
    contentType: "application/problem+json",
    cacheControl: "no-store",
    body: #{
        type: "/problems/email-already-exists",
        title: "Email already exists",
        status: 409,
        detail: "A user with this email already exists."
    }
};

const emailAlreadyExistsOperationExample = #{ returnType: emailAlreadyExistsExample };

const twoFactorAlreadyEnabledExample: ConflictError<TwoFactorAlreadyEnabledDetails> = #{
    statusCode: 409,
    contentType: "application/problem+json",
    cacheControl: "no-store",
    body: #{
        type: "/problems/two-factor-already-enabled",
        title: "Two-factor authentication already enabled",
        status: 409,
        detail: "Disable the existing factor before configuring a replacement."
    }
};

const twoFactorAlreadyEnabledOperationExample = #{ returnType: twoFactorAlreadyEnabledExample };

const twoFactorNotEnabledExample: ConflictError<TwoFactorNotEnabledDetails> = #{
    statusCode: 409,
    contentType: "application/problem+json",
    cacheControl: "no-store",
    body: #{
        type: "/problems/two-factor-not-enabled",
        title: "Two-factor authentication not enabled",
        status: 409,
        detail: "Enable two-factor authentication before performing this operation."
    }
};

const twoFactorNotEnabledOperationExample = #{ returnType: twoFactorNotEnabledExample };

const totpSetupExpiredExample: ConflictError<TotpSetupExpiredDetails> = #{
    statusCode: 409,
    contentType: "application/problem+json",
    cacheControl: "no-store",
    body: #{
        type: "/problems/totp-setup-expired",
        title: "TOTP setup expired",
        status: 409,
        detail: "Start TOTP setup again in the current session."
    }
};

const totpSetupExpiredOperationExample = #{ returnType: totpSetupExpiredExample };
