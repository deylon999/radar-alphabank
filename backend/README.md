# Бэкенд

Spring Boot 4.1, Java 25, PostgreSQL через Spring JDBC, Spring Security, сессии в Redis.
Договор API — спецификация [`../api/`](../api/).

## Что нужно

- JDK 25 или любой JDK, на котором запускается Gradle 9.8: недостающий JDK 25 для сборки
  Gradle скачает сам (toolchain).
- Docker: локальные PostgreSQL и Redis, а также тесты (Testcontainers).

## Запуск

```bash
cp .env.example .env    # задайте RADAR_DB_PASSWORD
./gradlew bootRun
```

`backend/.env` — единственное место локальных значений: его читают и `docker compose`,
и приложение (`spring.config.import`). Переменные окружения имеют приоритет над `.env`.

При запуске приложение само поднимает PostgreSQL 18 и Redis 8 из `compose.yaml`
(модуль `spring-boot-docker-compose`) и берёт адреса и пароль БД из контейнеров.
Контейнеры остаются работать после остановки приложения; остановить их —
`docker compose stop`. Модуль работает только при локальном запуске: в jar и тесты
он не попадает. Локальный Redis без пароля, порты открыты только на 127.0.0.1.

Из IntelliJ IDEA: конфигурация `RadarApplication`, **Working directory** —
каталог `backend`, иначе не найдутся `compose.yaml` и `.env`. Переменные окружения
в конфигурацию добавлять не нужно.

Миграции схемы (`src/main/resources/db/migration`) применяет Flyway при старте.

API отвечает под базовым путём `/api`, например `http://localhost:8080/api/auth/csrf`.

## Настройки окружения

| Переменная | Назначение |
| --- | --- |
| `RADAR_DB_URL`, `RADAR_DB_USERNAME`, `RADAR_DB_PASSWORD` | PostgreSQL |
| `RADAR_REDIS_HOST`, `RADAR_REDIS_PORT`, `RADAR_REDIS_PASSWORD` | Redis для сессий |
| `RADAR_CORS_ALLOWED_ORIGINS` | адреса фронтенда через запятую, если он на другом сайте; пусто — CORS выключен |
| `RADAR_LOG_DIR` | каталог файлов журнала, по умолчанию `logs` |
| `RADAR_LOGIN_EMAIL_ATTEMPTS`, `RADAR_LOGIN_IP_ATTEMPTS` | неудачных входов за 15 минут на email и на IP, по умолчанию 5 и 20 |
| `RADAR_REGISTRATION_IP_ATTEMPTS` | регистраций за час с одного IP, по умолчанию 5 |
| `SPRING_PROFILES_ACTIVE=production` | вывод в консоль в JSON (ECS) для сборщика журналов |

Фронтенд должен работать с того же сайта, что и API (cookie `SESSION` с `SameSite=Lax`),
поэтому `RADAR_CORS_ALLOWED_ORIGINS` обычно пуст.

В `.env.example` лимиты попыток подняты, чтобы повторные прогоны `./http/run.sh` локально
не упирались в 429. Без этих переменных действуют значения по умолчанию из таблицы.

IP клиента для лимитов — адрес TCP-соединения, заголовок `X-Forwarded-For` не учитывается.
За обратным прокси нужно явно включить `server.forward-headers-strategy=native` и указать
адреса прокси в `server.tomcat.remoteip.internal-proxies`, иначе все клиенты получат один IP.

Список распространённых паролей `src/main/resources/security/compromised-passwords.txt` —
пароли длиной от 15 символов из `Pwdb_top-1000000.txt` проекта
[SecLists](https://github.com/danielmiessler/SecLists) (лицензия MIT, © Daniel Miessler).

## Журналы

В `RADAR_LOG_DIR` пишутся файлы в формате JSON (ECS):

- `radar.json` — журнал приложения, ротация по 10 МБ, хранение 14 дней, не больше 1 ГБ;
- `security.json` — события безопасности (запрос без входа, отказ CSRF), хранение 90 дней.

На сервере каталог журналов — отдельный том вне каталога приложения, доступный только
пользователю приложения. Тесты и PIT пишут журналы в `build/`.

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
