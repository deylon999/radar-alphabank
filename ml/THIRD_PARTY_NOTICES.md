# Сторонние компоненты ML-сервиса

## Модели

Используются только модели из Приложения 3 кейса через OpenAI-совместимый прокси организаторов
(`https://changellenge.up.railway.app/v1`): Gemma 4 26B A4B, GLM-5.3-Flash, Qwen3.6 35B A3B,
DeepSeek-V4.1-Flash, Qwen3-VL-30B-A3B-Instruct, Kimi-K2.6. Другие LLM, эмбеддинги и внешние AI-сервисы
не используются. Агентная логика, поиск, ранжирование и проверки написаны командой.

## Данные

| Данные | Источник | В репозитории |
|---|---|---|
| df_Uid_data_hack.csv, df_Fid_Uid_link_hack.csv, df_Uid_payment_hack.csv | обезличенный датасет кейса (Альфа-Банк, Changellenge) | нет, монтируется в `data/raw` |
| Аналитические материалы ЦМИ Альфа-Банка (PDF) | материалы кейса | нет, монтируются в `data/materials` |
| `snapshots/news.jsonl` | публичные новости: заголовок, дата и ссылка первоисточника, краткое изложение командой своими словами | да |
| `tests/fixtures` | синтетические данные для тестов, придуманы командой | да |

Источники новостей для сбора (RSS, только заголовок, анонс, ссылка, дата): Банк России, Интерфакс, РБК,
Коммерсантъ, ТАСС, ПРАЙМ, Ведомости. В снимке также ссылки на The Moscow Times, Эксперт, Деловой Петербург,
Петербургский дневник, Российскую газету, Meduza, ТКС.РУ, РБК Недвижимость, РИА Недвижимость, RuNews24.

Страницы продуктов в `config/offers.yaml` ведут на общий раздел alfabank.ru для бизнеса. Это заглушка,
точные ссылки на продукты не подставлены.

## Библиотеки Python

Версии зафиксированы в `uv.lock`.

| Пакет | Лицензия | Назначение |
|---|---|---|
| fastapi | MIT | HTTP API |
| uvicorn | BSD-3-Clause | сервер |
| pydantic, pydantic-settings | MIT | схемы и настройки |
| httpx | BSD-3-Clause | запросы к моделям и источникам |
| pandas, numpy | BSD-3-Clause | датасет |
| PyYAML | MIT | конфигурация |
| Jinja2 | BSD-3-Clause | шаблоны промптов |
| feedparser | BSD-2-Clause | RSS |
| trafilatura | Apache-2.0 | текст статьи по ссылке |
| pypdf | BSD-3-Clause | PDF |
| python-docx | MIT | DOCX |
| snowballstemmer | BSD-3-Clause | стемминг для BM25 |
| python-multipart | Apache-2.0 | загрузка файлов |
| pytest, ruff, reportlab (dev) | MIT, MIT, BSD | тесты, линтер, PDF в тестах |

Базовый образ: `python:3.12-slim` (Docker Official Image).
