package io.github.radar.logging;

import io.github.radar.dto.CompanySummaryResponse;
import io.github.radar.dto.JoinRequestResponse;
import io.github.radar.exception.CompanyMembershipRequiredException;
import io.github.radar.exception.CompanyOwnerRequiredException;
import jakarta.servlet.http.HttpServletRequest;
import java.util.Map;
import java.util.UUID;
import org.aspectj.lang.annotation.AfterReturning;
import org.aspectj.lang.annotation.AfterThrowing;
import org.aspectj.lang.annotation.Aspect;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import org.springframework.web.servlet.HandlerMapping;

/**
 * Пишет в журнал безопасности изменения членства и отказы в доступе к компании.
 *
 * <p>Изменение членства меняет доступ к данным компании, поэтому это событие безопасности.
 * Сообщения заявителей и email в журнал не попадают; пользователь — userId из MDC.
 * Отказы пишутся на границе контроллера: так одно отказанное действие даёт одну запись.
 */
@Aspect
@Component
public class CompanyEventLoggingAspect {
    private static final Logger SECURITY_LOG = LoggerFactory.getLogger("radar.security");

    private static final String THROWN = "exception";

    private static final String CONTROLLERS =
            "@within(org.springframework.web.bind.annotation.RestController)";

    /**
     * Пишет создание компании: создатель стал её владельцем.
     *
     * @param company созданная компания
     */
    @AfterReturning(
            pointcut = "execution(* io.github.radar.service.CompanyService.create(..))",
            returning = "company"
    )
    public void logCompanyCreation(CompanySummaryResponse company) {
        SECURITY_LOG.atInfo()
                .setMessage("Создана компания {}, создатель стал владельцем")
                .addArgument(company::getId)
                .log();
    }

    /**
     * Пишет подачу заявки.
     *
     * @param request созданная заявка
     */
    @AfterReturning(
            pointcut = "execution(* io.github.radar.service.JoinRequestService.submit(..))",
            returning = "request"
    )
    public void logSubmission(JoinRequestResponse request) {
        SECURITY_LOG.atInfo()
                .setMessage("Подана заявка {} в компанию {}")
                .addArgument(request::getId)
                .addArgument(() -> request.getCompany().getId())
                .log();
    }

    /**
     * Пишет решение по заявке: одобрение, отклонение или отмену.
     *
     * @param request заявка после решения
     */
    @AfterReturning(
            pointcut = "execution(* io.github.radar.service.JoinRequestService.approve(..))"
                    + " || execution(* io.github.radar.service.JoinRequestService.reject(..))"
                    + " || execution(* io.github.radar.service.JoinRequestService.cancel(..))",
            returning = "request"
    )
    public void logDecision(JoinRequestResponse request) {
        SECURITY_LOG.atInfo()
                .setMessage("Заявка {} в компанию {}: {}")
                .addArgument(request::getId)
                .addArgument(() -> request.getCompany().getId())
                .addArgument(() -> request.getStatus().code())
                .log();
    }

    /**
     * Пишет исключение участника или выход из компании.
     *
     * @param companyId ID компании
     * @param userId ID пользователя, потерявшего членство
     */
    @AfterReturning(
            "execution(* io.github.radar.service.MemberService.remove(..))"
                    + " && args(companyId, userId, *)"
    )
    public void logRemoval(String companyId, UUID userId) {
        SECURITY_LOG.info("Из компании {} исключён пользователь {}", companyId, userId);
    }

    /**
     * Пишет отказ из-за отсутствия членства в компании.
     *
     * @param exception отказ
     */
    @AfterThrowing(pointcut = CONTROLLERS, throwing = THROWN)
    public void logMissingMembership(CompanyMembershipRequiredException exception) {
        logDenial(exception);
    }

    /**
     * Пишет отказ из-за отсутствия прав владельца.
     *
     * @param exception отказ
     */
    @AfterThrowing(pointcut = CONTROLLERS, throwing = THROWN)
    public void logMissingOwnership(CompanyOwnerRequiredException exception) {
        logDenial(exception);
    }

    private void logDenial(RuntimeException exception) {
        HttpServletRequest request =
                ((ServletRequestAttributes) RequestContextHolder.currentRequestAttributes())
                        .getRequest();
        SECURITY_LOG.atWarn()
                .setMessage("Отказ в доступе к компании {}: {} {}, {}")
                .addArgument(() -> companyId(request))
                .addArgument(request::getMethod)
                .addArgument(() -> request.getAttribute(
                        HandlerMapping.BEST_MATCHING_PATTERN_ATTRIBUTE))
                .addArgument(() -> exception.getClass().getSimpleName())
                .log();
    }

    private Object companyId(HttpServletRequest request) {
        return ((Map<?, ?>) request.getAttribute(HandlerMapping.URI_TEMPLATE_VARIABLES_ATTRIBUTE))
                .get("companyId");
    }
}
