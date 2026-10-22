# Бэкенд

Spring Boot 4.1, Java 25, PostgreSQL через Spring JDBC, Spring Security, сессии в Redis.
Договор API — спецификация [`../api/`](../api/).

## Что нужно

- JDK 25 или любой JDK, на котором запускается Gradle 9.8: недостающий JDK 25 для сборки
  Gradle скачает сам (toolchain).
- Docker: локальные PostgreSQL и Redis, а также тесты (Testcontainers).

## Запуск

```bash
cp .env.example .env          # задайте RADAR_DB_PASSWORD и RADAR_REDIS_PASSWORD
docker compose up -d          # PostgreSQL 18 и Redis 8 на 127.0.0.1
set -a && . ./.env && set +a  # переменные окружения для приложения
./gradlew bootRun
```

Миграции схемы (`src/main/resources/db/migration`) применяет Flyway при старте.

## Проверки

```bash
./gradlew check     # Checkstyle, PMD, тесты и пороги JaCoCo (80% строк и ветвей)
./gradlew pitest    # мутационный анализ, отдельно от check
./gradlew pitest -PpitTargetClasses='io.github.radar.domain.*'   # только выбранная область
```

Тестам нужен Docker: PostgreSQL и Redis поднимаются через Testcontainers.

Отчёты лежат в `build/reports/`: `tests/`, `jacoco/`, `checkstyle/`, `pmd/`, `pitest/`.

## Проверка запущенного сервера

Сценарии [Hurl](https://hurl.dev) лежат в `http/` и сгруппированы по сценариям использования.
Они отправляют настоящие запросы к запущенному серверу и проверяют ответы по контракту.

Установка Hurl 8.0.1:

```bash
curl -LO https://github.com/Orange-OpenSource/hurl/releases/download/8.0.1/hurl-8.0.1-x86_64-unknown-linux-gnu.tar.gz
tar -xzf hurl-8.0.1-x86_64-unknown-linux-gnu.tar.gz
cp hurl-8.0.1-x86_64-unknown-linux-gnu/bin/hurl ~/.local/bin/
```

Запуск при работающем сервере (`./gradlew bootRun`):

```bash
./http/run.sh                                            # все сценарии
./http/run.sh csrf/                                      # один сценарий использования
./http/run.sh csrf/rejects_change_without_token.hurl     # один файл
RADAR_BASE_URL=https://radar.example/api ./http/run.sh   # другой адрес
```
