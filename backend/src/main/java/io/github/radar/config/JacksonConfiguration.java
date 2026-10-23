package io.github.radar.config;

import org.springframework.boot.jackson.autoconfigure.JsonMapperBuilderCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import tools.jackson.databind.cfg.CoercionAction;
import tools.jackson.databind.cfg.CoercionInputShape;
import tools.jackson.databind.type.LogicalType;

/**
 * Строгий разбор JSON: число или логическое значение не превращается в строку молча,
 * а даёт ошибку поля INVALID_TYPE.
 */
@Configuration
public class JacksonConfiguration {
    /**
     * Запрещает приведение скаляров к строковым полям.
     *
     * @return настройка JsonMapper
     */
    @Bean
    public JsonMapperBuilderCustomizer strictTextualCoercion() {
        return builder -> builder.withCoercionConfig(LogicalType.Textual, coercion -> coercion
                .setCoercion(CoercionInputShape.Integer, CoercionAction.Fail)
                .setCoercion(CoercionInputShape.Float, CoercionAction.Fail)
                .setCoercion(CoercionInputShape.Boolean, CoercionAction.Fail));
    }
}
