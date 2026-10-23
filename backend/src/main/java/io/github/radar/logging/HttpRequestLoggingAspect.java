package io.github.radar.logging;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.lang.reflect.Method;
import org.aspectj.lang.JoinPoint;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.AfterThrowing;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.reflect.MethodSignature;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.annotation.AnnotatedElementUtils;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import org.springframework.web.servlet.HandlerMapping;

/**
 * Пишет одну запись на каждый запрос, обработанный контроллером.
 *
 * <p>Аргументы, результаты и тела запросов не пишутся: в них бывают пароли и данные компаний.
 * Маршрут — шаблон вида /companies/{companyId}, а не URL с параметрами.
 */
@Aspect
@Component
public class HttpRequestLoggingAspect {
    private static final Logger LOG = LoggerFactory.getLogger(HttpRequestLoggingAspect.class);

    /**
     * Пишет метод, маршрут, итоговый статус и длительность успешно обработанного запроса.
     *
     * @param joinPoint вызов метода контроллера
     * @return результат контроллера
     * @throws Throwable исключение контроллера без изменений
     */
    @Around("@within(org.springframework.web.bind.annotation.RestController)")
    public Object logHandledRequest(ProceedingJoinPoint joinPoint) throws Throwable {
        long startedAt = System.nanoTime();
        Object result = joinPoint.proceed();
        ServletRequestAttributes attributes = currentAttributes();
        LOG.atInfo()
                .setMessage("{} {} -> {} за {} мс")
                .addArgument(attributes.getRequest().getMethod())
                .addArgument(route(attributes.getRequest()))
                .addArgument(status(result, joinPoint, attributes.getResponse()))
                .addArgument((System.nanoTime() - startedAt) / 1_000_000)
                .log();
        return result;
    }

    /**
     * Пишет запрос, контроллер которого завершился исключением. Stack trace здесь не пишется:
     * его один раз пишет обработчик ошибок.
     *
     * @param joinPoint вызов метода контроллера
     * @param exception исключение контроллера
     */
    @AfterThrowing(
            pointcut = "@within(org.springframework.web.bind.annotation.RestController)",
            throwing = "exception"
    )
    public void logFailedRequest(JoinPoint joinPoint, Throwable exception) {
        HttpServletRequest request = currentAttributes().getRequest();
        LOG.atWarn()
                .setMessage("{} {} -> исключение {}")
                .addArgument(request::getMethod)
                .addArgument(() -> route(request))
                .addArgument(() -> exception.getClass().getName())
                .log();
    }

    private ServletRequestAttributes currentAttributes() {
        return (ServletRequestAttributes) RequestContextHolder.currentRequestAttributes();
    }

    private Object route(HttpServletRequest request) {
        return request.getAttribute(HandlerMapping.BEST_MATCHING_PATTERN_ATTRIBUTE);
    }

    private int status(Object result, JoinPoint joinPoint, HttpServletResponse response) {
        if (result instanceof ResponseEntity<?> entity) {
            return entity.getStatusCode().value();
        }
        Method method = ((MethodSignature) joinPoint.getSignature()).getMethod();
        ResponseStatus responseStatus =
                AnnotatedElementUtils.findMergedAnnotation(method, ResponseStatus.class);
        if (responseStatus != null) {
            return responseStatus.code().value();
        }
        return response.getStatus();
    }
}
