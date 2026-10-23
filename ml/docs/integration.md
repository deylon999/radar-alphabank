# Интеграция бэкенда с ML-сервисом

Как публичные эндпойнты из `api/` ложатся на внутренний API ML. ML отдаёт данные в той же форме и в camelCase.
Бэкенд хранит их, добавляет личные статусы и проверяет права. Все запросы к ML идут с заголовком
`X-Internal-Token: $RADAR_ML_INTERNAL_TOKEN`, адрес внутри compose — `http://ml:8090`.

## Что хранит кто

| Данные | Где |
|---|---|
| пользователи, членство, должность, факты (pending/confirmed/rejected), статусы выводов, оценки, вопросы | бэкенд |
| события и источники, индекс аналитики банка, позиции банка, кэш LLM, трассы, кэш готовых выводов | ML |
| вывод (InsightResponse) | бэкенд хранит копию из ML по `insightKey` |

## Контекст компании

Почти все вызовы ML принимают `context` — то, что бэкенд знает о компании помимо датасета.
Факты передаются все, в аналитике ML использует только `confirmed`:

```json
{
  "companyId": "U_9250",
  "name": "Клиент U_9250",
  "description": "Строим дороги и мосты в Иркутской области...",
  "facts": [
    {"id": "4e7a9c2b-1d3f-4a5b-8c6d-7e8f9a0b1c2d", "category": "finance",
     "statement": "Основной кредит — с плавающей ставкой: ключевая ставка плюс 2,5 п. п.", "status": "confirmed"}
  ]
}
```

`companyId` контекста обязан совпадать с компанией запроса, иначе 400.

## Лента выводов

`GET /companies/{companyId}/insights`, `/digest`, `/overview`, `GET /insights/{id}`.

1. Бэкенд ставит задание сборки ленты: `POST /v1/companies/{id}/feed/jobs` с телом `{"context": ..., "limit": 12}`.
   Ответ — `{"id": "...", "status": "QUEUED"}`. Опрос: `GET /v1/jobs/{id}` до `DONE` или `FAILED`.
   Пока задание идёт, `analysis.status = preparing`.
2. `result.insights[]` — готовые InsightResponse без полей бэкенда. Сохранить по `insightKey`
   (стабилен для пары компания + событие):
   - новый `insightKey` → новый вывод: `id` = новый UUID, `createdAt = updatedAt = now`, `revisions = []`,
     `status` для всех участников — `new`;
   - существующий `insightKey`, у которого изменилось содержимое (`eventVersion`, `title`, `consequence`,
     `bankView`) → обновить, `updatedAt = now`, в `revisions` добавить `{at: now, note: revisionNote}`
     (`revisionNote` приходит от ML), статус `read` → `new`, а `dismissed` остаётся скрытым.
3. Служебные поля ML (`insightKey`, `eventId`, `eventVersion`, `score`, `traceId`, `generatedBy`,
   `revisionNote`) наружу не отдавать или отдать в админских ответах. `traceId` нужен экспертам.
4. `result.analysisStatus` → `analysis.status` компании: `ready` или `needs_context` (у пользовательской
   компании меньше двух подтверждённых фактов).

Порядок ленты по контракту — срочность, затем важность для должности, затем `updatedAt`. Важность для должности
= `score × вес темы для должности` из `config/sectors.yaml → roles`. Готовый порядок под должность отдаёт
`POST /v1/companies/{id}/candidates` с `{"position": "cfo"}`. Фильтры, курсор, `digest` и `overview`
бэкенд считает по своим сохранённым выводам.

Когда пересобирать:
- после сбора новостей (новые или обновлённые события). Сбор запускает ML сам при
  `RADAR_ML_COLLECT_INTERVAL_MIN > 0` или бэкенд по расписанию: `POST /v1/news/collect`;
- после изменения подтверждённых фактов компании (`PATCH .../facts/{id}`): статус `preparing`, новое задание.

ML кэширует выводы, поэтому повторная сборка без изменений стоит ноль токенов.

## Вопрос по выводу

`POST /insights/{insightId}/ask` (SSE). Права, CSRF, валидацию и лимиты бэкенд проверяет до начала потока,
как в контракте. Затем проксирует поток из ML:

```http
POST /v1/insights/ask
{"companyId": "U_9250", "context": {...}, "insight": {<сохранённый InsightResponse>}, "question": "Что будет при ставке 12%?", "role": "cfo"}
```

ML отдаёт `event: step` → … → `event: answer` либо `event: error` с теми же типами
(`/problems/ai-unavailable`, `/problems/answer-timeout`, `/problems/answer-failed`). Поток можно пробрасывать
байт в байт. Если клиент закрыл соединение, бэкенд закрывает соединение с ML. Вопрос сохранить для метрик.

## Описание компании и документы

`POST /companies/{companyId}/describe`:

```http
POST /v1/facts/extract
{"companyId": "U_9250", "text": "...", "links": [{"url": "https://..."}], "existing": ["формулировки всех фактов компании в любом статусе"]}
```

Ссылки ML загружает сам: только http(s), без внутренних адресов, с лимитом размера, времени и перенаправлений.
Если бэкенд уже загрузил страницу, передайте `text` в элементе `links`. Ответ:

```json
{"facts": [{"category": "supplier", "statement": "...", "source": {"kind": "text", "label": "Описание компании"},
            "evidence": "дословный фрагмент", "negated": false}],
 "incompleteSources": [{"kind": "link", "label": "example.com"}], "unknownFields": ["условия кредита"], "method": "llm"}
```

Бэкенд присваивает фактам `id`, ставит `pending`, `createdAt` и сохраняет. Дубли уже отсеяны по `existing`.
Таймаут контракта — 15 секунд: если ML не уложился, вернуть 503 `ai-unavailable` и ничего не сохранять.

`POST /companies/{companyId}/documents` → `POST /v1/facts/extract-documents` (multipart: `companyId`,
`existing` — JSON-массив строк, `files` — 1–5 файлов). Ответ тот же.

## Профиль компании

`ClientProfile` из `api/companies` можно отдавать из своей БД (импорт CSV) или брать
из `POST /v1/companies/{id}/profile`:

| ClientProfile | ML `profile` |
|---|---|
| `okved.code/name` | `okved.code/name` |
| `region`, `city` | `region` (как в датасете), `city` (уже без «г.») |
| `revenue`, `employees`, `ageYears`, `stage`, `ownership` | те же поля |
| `relationship`, `products` | те же поля и значения |
| `foreignTrade.countries` | `foreignTradeCountries` |
| `group.id`, `group.companies` | `group.id`, `group.companies` |
| `counterparties[]` (до 5) | `counterparties[]`: `id`, `direction`, `amount`, `payments`, `industry` |

Там же — то, чего нет в публичном контракте, но полезно экрану профиля и экспертам: `sector`, `scale`,
`industryPosition` (место и доля среди клиентов банка), `factors` (факторы чувствительности с происхождением),
`dataQuality`.

## Метрики качества

`GET /metrics/quality` бэкенд считает по своим данным: оценки, прочтения, вопросы, полнота по сохранённым
выводам. Внутренние метрики агента — `GET /v1/quality?days=7`: самопроверка с первой попытки, переписывания,
дозапросы, откаты на правила, стоимость, время, вызовы инструментов. Расход лимита — `GET /v1/usage`.

## Ошибки ML

Problem Details с типами `/problems/unauthorized` (401), `/problems/bad-request` (400), `/problems/not-found` (404),
`/problems/validation-failed` (422), `/problems/unsafe-url` (422), `/problems/source-unavailable` (502),
`/problems/ai-unavailable` (503). Если модель недоступна, ML не падает, а собирает вывод по правилам
(`generatedBy: "rules"`), поэтому лента продолжает обновляться.

## Пример: вывод, как его отдаёт ML

Собран без ключа (правила), компания U_9250 из датасета, событие из снимка новостей:

```json
{
  "insightKey": "7d9af44c1726659765ece761",
  "eventId": "ev-a62caae147a4b9f0",
  "eventVersion": 2,
  "companyId": "U_9250",
  "kind": "risk",
  "urgency": "urgent",
  "relevance": "direct",
  "topic": "financing",
  "title": "Кредиты не подешевеют: Банк России принял решение сохранить ключевую ставку на уровне…",
  "event": {"title": "Банк России принял решение сохранить ключевую ставку на уровне 14,00% годовых", "stage": "decided",
            "occurredAt": "2026-10-23T13:30:00+03:00"},
  "impactPath": [{"label": "Банк России принял решение сохранить ключевую ставку на…", "role": "event"},
                 {"label": "Стоимость заёмных денег", "role": "market"}, {"label": "Клиент U_9250", "role": "company"}],
  "basis": ["Совет директоров Банка России 23 октября 2026 года сохранил ключевую ставку на уровне 14,00% годовых — второе заседание подряд без изменения.",
            "Основной кредит — с плавающей ставкой: ключевая ставка плюс 2,5 п. п."],
  "sources": [{"id": "art-faa6a21ca8f174fe", "publisher": "Банк России", "url": "https://www.cbr.ru/press/PR/?file=23102026_133000key.htm", "...": "..."},
              {"id": "art-1a240caf0ab5ed72", "publisher": "Ведомости", "...": "..."}],
  "signals": [{"origin": "fact", "factId": "4e7a9c2b-1d3f-4a5b-8c6d-7e8f9a0b1c2d", "label": "Финансы",
               "value": "Основной кредит — с плавающей ставкой: ключевая ставка плюс 2,5 п. п."},
              {"origin": "bank_data", "label": "Продукты банка", "value": "кредиты, лизинг, банковские гарантии, зарплатный проект"}],
  "offer": {"title": "Процентный своп", "description": "...", "url": "https://alfabank.ru/corporate/"},
  "generatedBy": "rules",
  "traceId": "..."
}
```

С ключом тот же вывод пишет агент (`generatedBy: "agent"`). При загруженных PDF банка появляется `bankView`
со ссылкой на страницу материала.
