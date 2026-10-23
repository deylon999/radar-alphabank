package io.github.radar;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Точка входа бэкенда "Радара".
 */
@SpringBootApplication
public class RadarApplication {
    /**
     * Запускает приложение.
     *
     * @param args аргументы командной строки
     */
    public static void main(String[] args) {
        SpringApplication.run(RadarApplication.class, args);
    }
}
