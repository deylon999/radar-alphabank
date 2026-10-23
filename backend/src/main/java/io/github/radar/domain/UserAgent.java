package io.github.radar.domain;

import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Предполагаемые браузер и ОС по заголовку User-Agent. Это не доказательство устройства.
 *
 * <p>Признаки проверяются по порядку: строка Edge содержит Chrome, строка Android — Linux,
 * строка iPhone — Mac OS X, поэтому более точные признаки идут первыми.
 */
public class UserAgent {
    private static final List<Map.Entry<String, String>> BROWSERS = List.of(
            Map.entry("Edg/", "Edge"),
            Map.entry("OPR/", "Opera"),
            Map.entry("YaBrowser/", "Yandex Browser"),
            Map.entry("Firefox/", "Firefox"),
            Map.entry("FxiOS/", "Firefox"),
            Map.entry("CriOS/", "Chrome"),
            Map.entry("Chrome/", "Chrome"),
            Map.entry("Safari/", "Safari")
    );

    private static final List<Map.Entry<String, String>> OPERATING_SYSTEMS = List.of(
            Map.entry("Windows", "Windows"),
            Map.entry("Android", "Android"),
            Map.entry("iPhone", "iOS"),
            Map.entry("iPad", "iOS"),
            Map.entry("CrOS", "ChromeOS"),
            Map.entry("Mac OS X", "macOS"),
            Map.entry("Linux", "Linux")
    );

    private final String header;

    /**
     * Создаёт описание по заголовку.
     *
     * @param header значение User-Agent или null, если заголовка нет
     */
    public UserAgent(String header) {
        this.header = header;
    }

    /**
     * Определяет браузер.
     *
     * @return название браузера или пустой результат
     */
    public Optional<String> browser() {
        return firstMatch(BROWSERS);
    }

    /**
     * Определяет операционную систему.
     *
     * @return название ОС или пустой результат
     */
    public Optional<String> operatingSystem() {
        return firstMatch(OPERATING_SYSTEMS);
    }

    private Optional<String> firstMatch(List<Map.Entry<String, String>> markers) {
        return Optional.ofNullable(header).flatMap(value -> markers.stream()
                .filter(marker -> value.contains(marker.getKey()))
                .map(Map.Entry::getValue)
                .findFirst());
    }
}
