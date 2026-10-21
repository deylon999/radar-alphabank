import "../../../common/error/ForbiddenError.tsp";
import "../../../common/error/NotFoundError.tsp";
import "../../../common/error/ConflictError.tsp";

using AlfaHackathonApi.Errors;

namespace AlfaHackathonApi.Companies.Errors;

@doc("Компании с таким ID нет.")
model CompanyNotFoundDetails {
    ...OmitProperties<ProblemDetails<404>, "type">;
    type: "/problems/company-not-found";
}

@doc("Пользователь не состоит в компании. Заявка, ожидающая решения, доступа не даёт.")
model CompanyMembershipRequiredDetails {
    ...OmitProperties<ProblemDetails<403>, "type">;
    type: "/problems/company-membership-required";
}

@doc("Действие доступно только владельцу компании.")
model CompanyOwnerRequiredDetails {
    ...OmitProperties<ProblemDetails<403>, "type">;
    type: "/problems/company-owner-required";
}

@doc("Пользователь уже состоит в компании. Состоять можно только в одной.")
model AlreadyCompanyMemberDetails {
    ...OmitProperties<ProblemDetails<409>, "type">;
    type: "/problems/already-company-member";
}

@doc("У пользователя есть заявка, ожидающая решения. Сначала её нужно отменить.")
model JoinRequestPendingDetails {
    ...OmitProperties<ProblemDetails<409>, "type">;
    type: "/problems/join-request-pending";
}

const companyNotFoundExample: NotFoundError<CompanyNotFoundDetails> = #{
    statusCode: 404,
    contentType: "application/problem+json",
    cacheControl: "no-store",
    body: #{
        type: "/problems/company-not-found",
        title: "Компания не найдена",
        status: 404,
        detail: "Компании с таким ID нет."
    }
};

const companyNotFoundOperationExample = #{ returnType: companyNotFoundExample };

const companyMembershipRequiredExample: ForbiddenError<CompanyMembershipRequiredDetails> = #{
    statusCode: 403,
    contentType: "application/problem+json",
    cacheControl: "no-store",
    body: #{
        type: "/problems/company-membership-required",
        title: "Нет доступа к компании",
        status: 403,
        detail: "Вы не состоите в этой компании. Подайте заявку на вступление."
    }
};

const companyMembershipRequiredOperationExample = #{ returnType: companyMembershipRequiredExample };

const companyOwnerRequiredExample: ForbiddenError<CompanyOwnerRequiredDetails> = #{
    statusCode: 403,
    contentType: "application/problem+json",
    cacheControl: "no-store",
    body: #{
        type: "/problems/company-owner-required",
        title: "Нужны права владельца",
        status: 403,
        detail: "Это действие доступно только владельцу компании."
    }
};

const companyOwnerRequiredOperationExample = #{ returnType: companyOwnerRequiredExample };

const alreadyCompanyMemberExample: ConflictError<AlreadyCompanyMemberDetails> = #{
    statusCode: 409,
    contentType: "application/problem+json",
    cacheControl: "no-store",
    body: #{
        type: "/problems/already-company-member",
        title: "Вы уже состоите в компании",
        status: 409,
        detail: "Чтобы перейти в другую компанию, сначала выйдите из текущей."
    }
};

const alreadyCompanyMemberOperationExample = #{ returnType: alreadyCompanyMemberExample };

const joinRequestPendingExample: ConflictError<JoinRequestPendingDetails> = #{
    statusCode: 409,
    contentType: "application/problem+json",
    cacheControl: "no-store",
    body: #{
        type: "/problems/join-request-pending",
        title: "Заявка ожидает решения",
        status: 409,
        detail: "У вас есть заявка на вступление, которая ещё не рассмотрена. Сначала отмените её."
    }
};

const joinRequestPendingOperationExample = #{ returnType: joinRequestPendingExample };
