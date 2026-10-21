# Контракт API «Радара»

Версия 2 — под кейс Альфа-Банка: клиенты из обезличенного датасета, позиция банка по его
аналитике, признаки клиента и шаги агента в каждом выводе, вопросы по инсайту. Источник
правды — zod-схемы в `src/schemas/`: фронтенд проверяет каждый ответ, и всё, что не совпадает
с контрактом, показывает как ошибку. Если меняется формат — правим схемы, моки (`src/mocks/`)
и этот файл вместе.

## Кто что пишет в инсайте

Кейс требует, чтобы пользователь видел, какие выводы — позиция банка, а какие сделала модель.
Интерфейс подписывает поля так:

| Поля                                                  | Что это                               | Подпись в интерфейсе    |
| ----------------------------------------------------- | ------------------------------------- | ----------------------- |
| `event`, `basis`, `sources`                           | факты из новостей и данных клиента    | без метки, с источником |
| `bankView`                                            | выжимка из аналитики Альфа-Банка      | «Позиция банка»         |
| `whyItMatters`, `impactPath`, `consequence`, `checks` | интерпретация модели                  | «Вывод AI»              |
| `signals`                                             | признаки клиента, повлиявшие на вывод | «Признаки компании»     |
| `trace`                                               | шаги агента                           | «Как получен вывод»     |
| `offer`                                               | продукт банка, уместный в контексте   | «Предложение банка»     |

Позицию банка модель не придумывает: в `bankView.summary` — только то, что есть в материале
`bankView.material`. Если по теме материала нет, поле не передаётся.

## Общие правила

- Базовый адрес — `VITE_API_URL` (по умолчанию `http://localhost:8000`), все пути начинаются с `/api`.
- Тела запросов и ответов — JSON, `Content-Type: application/json`. Исключение — загрузка документов (`multipart/form-data`).
- Даты — ISO 8601 со смещением или `Z`: `2026-10-18T09:20:00Z`.
- Необязательные поля **не передаются**, а не приходят как `null` (кроме `nextCursor`).
- Лишние поля фронтенд игнорирует, так что их можно добавлять без согласования.
- Ошибки — код 4xx/5xx и тело `{ "message": "Понятный текст по-русски" }`. Текст из `message` может показываться пользователю.
- Таймаут на стороне фронтенда — 15 с (загрузка документов — 60 с).
- CORS: разрешите адрес сайта на Vercel (`https://<проект>.vercel.app` — точный адрес даст фронтенд),
  а для разработки `http://127.0.0.1:5173` и превью сборки `http://127.0.0.1:4173`. Методы:
  `GET`, `POST`, `PUT`, `PATCH`; заголовок `Content-Type`.
- Бэкенд должен работать по `https`: со страницы на `https` браузер не пустит запросы на `http`.

## Эндпоинты

| Метод | Путь                               | Ответ                                              |
| ----- | ---------------------------------- | -------------------------------------------------- |
| GET   | `/api/companies?q=`                | `Company[]` — поиск клиента, до 20 результатов     |
| GET   | `/api/companies/:id`               | `Company`                                          |
| POST  | `/api/companies/:id/describe`      | `{ facts: ProfileFact[] }`                         |
| POST  | `/api/companies/:id/documents`     | `{ facts: ProfileFact[] }`                         |
| PATCH | `/api/companies/:id/facts/:factId` | `ProfileFact`                                      |
| GET   | `/api/companies/:id/insights`      | `{ items: Insight[], nextCursor: string \| null }` |
| GET   | `/api/companies/:id/digest`        | `Digest`                                           |
| GET   | `/api/companies/:id/overview`      | `Overview` — выводы по темам и материалам банка    |
| GET   | `/api/insights/:id`                | `Insight`                                          |
| PATCH | `/api/insights/:id`                | `Insight`                                          |
| POST  | `/api/insights/:id/feedback`       | `204 No Content`                                   |
| POST  | `/api/insights/:id/ask`            | `Answer` — ответ на уточняющий вопрос              |
| GET   | `/api/metrics/quality`             | `QualityMetrics` — метрики качества выводов        |
| GET   | `/api/notifications/settings`      | `NotificationSettings`                             |
| PUT   | `/api/notifications/settings`      | `NotificationSettings`                             |
| POST  | `/api/notifications/telegram/link` | `{ url: string }`                                  |

### Лента: `GET /api/companies/:id/insights`

Параметры адреса (все необязательные):

| Параметр    | Значения                                                                    | Пример                        |
| ----------- | --------------------------------------------------------------------------- | ----------------------------- |
| `kind`      | `risk`, `opportunity`; можно несколько                                      | `?kind=risk&kind=opportunity` |
| `urgency`   | `urgent`, `important`, `info`; можно несколько                              | `?urgency=urgent`             |
| `stage`     | `occurred`, `discussed`, `decided`, `resolved`; можно несколько             | `?stage=decided`              |
| `relevance` | `direct` или `possible`; одно значение                                      | `?relevance=direct`           |
| `q`         | поиск по тексту: заголовок, «почему касается», событие, место, шаги цепочки | `?q=склад`                    |
| `role`      | `owner`, `ceo`, `cfo`, `accountant`, `treasurer`, `other` — роль читателя   | `?role=cfo`                   |
| `cursor`    | значение `nextCursor` из предыдущей страницы                                | `?cursor=offset:10`           |

- Несколько значений одного параметра объединяются через «или», разные параметры — через «и».
- Неизвестное значение enum — ответ `400`.
- **Порядок:** сначала `urgency = urgent`, затем по `updatedAt`, новые выше. С `role` бэкенд
  может поднимать выше то, что важнее для роли (финдиректору — ставки и долг, бухгалтеру —
  налоги и платежи), но срочное всё равно первое.
- Инсайты со статусом `dismissed` в ленту не попадают.
- Размер страницы — на усмотрение бэкенда (в моках 6). Курсор непрозрачный: фронтенд его не разбирает.

Пример ответа:

```json
{
  "items": [
    {
      "id": "u9250-key-rate",
      "companyId": "U_9250",
      "kind": "risk",
      "urgency": "important",
      "relevance": "direct",
      "status": "new",
      "topic": "financing",
      "title": "ЦБ сохранил ставку 14% и дал жёсткий сигнал: кредиты не подешевеют до конца года",
      "whyItMatters": "У компании кредиты, лизинг и гарантии в Альфа-Банке — стоимость обслуживания долга останется высокой",
      "event": {
        "title": "Совет директоров Банка России сохранил ключевую ставку 14,0%",
        "stage": "decided",
        "occurredAt": "2026-09-11T10:30:00Z"
      },
      "impactPath": [
        { "label": "Ключевая ставка 14%", "role": "event" },
        { "label": "Стоимость кредитов и лизинга", "role": "market" },
        { "label": "Клиент U_9250", "role": "company" }
      ],
      "consequence": "Процентные расходы по плавающим кредитам и лизингу не снизятся минимум до весны 2027 года",
      "basis": ["Банк России 11 сентября сохранил ключевую ставку на уровне 14,0%"],
      "unknowns": ["Доля долга с плавающей ставкой"],
      "checks": ["Пересчитать бюджет процентных расходов на 4 квартал при ставке 14%"],
      "sources": [
        {
          "id": "u9250-key-rate-s1",
          "title": "Банк России сохранил ключевую ставку",
          "publisher": "Официальные сообщения (тестовые данные)",
          "url": "https://example.com/news/u9250-key-rate-1",
          "publishedAt": "2026-09-11T10:30:00Z"
        }
      ],
      "createdAt": "2026-09-11T12:00:00Z",
      "updatedAt": "2026-09-11T12:00:00Z",
      "revisions": [],
      "bankView": {
        "summary": "Ждём сохранения ставки 14,0% до конца 2026 года; к концу 2027 — 12%",
        "material": {
          "id": "macro-policy-rate-2026-09-11",
          "title": "Ключевая ставка ЦБ РФ: ставка без изменения на 14,0%, риторика стала жестче",
          "publishedAt": "2026-09-11T00:00:00Z",
          "page": 1
        },
        "supersedes": {
          "summary": "Ждём ставку 13,5% на конец 2026 года",
          "material": {
            "id": "macro-stat-1h26",
            "title": "Макростатистика 1П26",
            "publishedAt": "2026-07-31T00:00:00Z",
            "page": 1
          }
        }
      },
      "signals": [
        { "label": "Продукты банка", "value": "кредиты, лизинг, гарантии" },
        { "label": "Отрасль", "value": "строительство инженерных сооружений" }
      ],
      "trace": [
        {
          "kind": "plan",
          "title": "Событие касается стоимости денег — нужны долговые продукты клиента"
        },
        { "kind": "tool", "title": "Профиль клиента", "detail": "кредиты, лизинг, гарантии" },
        { "kind": "tool", "title": "Аналитика банка", "detail": "2 материала о ставке" },
        { "kind": "check", "title": "Материалы расходятся — взят более свежий от 11 сентября" },
        { "kind": "conclusion", "title": "Риск: долговая нагрузка не снизится" }
      ],
      "offer": {
        "title": "Хеджирование процентного риска",
        "description": "Процентный своп фиксирует ставку по кредиту с плавающей ставкой",
        "url": "https://example.com/alfa/irs"
      },
      "suggestedQuestions": ["Что будет при ставке 12%?", "Когда банк ждёт снижения ставки?"]
    }
  ],
  "nextCursor": "offset:10"
}
```

Требования к полям `Insight`:

- `impactPath` — 2–6 шагов от события до компании; последний шаг — `role: "company"`.
- `consequence` — всегда гипотеза: интерфейс подписывает её «Гипотеза». **Не присылайте оценки вероятности, «уверенность модели» и проценты достоверности** — интерфейс их не показывает по правилам продукта.
- `basis` — только установленные факты; `unknowns` и `checks` могут быть пустыми.
- `sources` — минимум один источник с издателем, датой и ссылкой.
- `title` — до ~90 символов: в ленте он обрезается после двух строк.
- `topic` — одна тема на вывод (список — в «Enum»): по ней строится разрез «По темам» в обзоре.
- `bankView` — необязательное. Есть, только если тема есть в аналитике банка. `material` —
  материал, из которого взята оценка: название, дата, страница.
  - `supersedes` — прежняя оценка банка, которую пересмотрел более свежий материал.
    Интерфейс пишет «Банк пересмотрел оценку: было → стало».
  - `material.outdated: true` — материал старый для текущей ситуации (например, отраслевой
    обзор 2021 года). Интерфейс предупреждает, что на него нельзя опираться.
- `signals` — 1–5 признаков клиента из профиля, на которых построен вывод. Признаки, которые
  не повлияли на вывод, не передаются.
- `trace` — шаги агента по порядку: `plan` → `tool` (какие данные запрошены) → `check`
  (самопроверка: полнота, противоречия, свежесть) → `conclusion`. Без внутренних промптов
  и служебных данных: это видит пользователь.
- `offer` — необязательное, не больше одного; только если продукт связан с выводом.
- `suggestedQuestions` — до 4 подсказок для «Задать вопрос».

### Сводка: `GET /api/companies/:id/digest`

```json
{ "since": "2026-10-11T00:00:00Z", "urgentRisks": 1, "risks": 6, "opportunities": 4 }
```

- Считаются только инсайты с `relevance = direct` — вкладка «Главное». «Под наблюдением» в сводку не входит.
- `risks` — **все** риски с даты `since`, включая срочные. Так число совпадает с лентой при фильтре «Риски».
- `urgentRisks` — срочные риски (они же входят в `risks`).
- Скрытые (`dismissed`) инсайты не считаются. В моках период — 7 дней.

### Обзор: `GET /api/companies/:id/overview`

Все актуальные выводы компании в двух разрезах — для страницы «Обзор».

```json
{
  "topics": [
    {
      "topic": "financing",
      "insights": [
        {
          "id": "u9250-key-rate",
          "kind": "risk",
          "urgency": "urgent",
          "relevance": "direct",
          "status": "new",
          "title": "ЦБ сохранил ставку 14% и ужесточил риторику: кредиты не подешевеют до конца года",
          "updatedAt": "2026-10-18T09:20:00Z"
        }
      ]
    }
  ],
  "materials": [
    {
      "material": {
        "id": "policy-rate-2026-09-11",
        "title": "Ключевая ставка ЦБ РФ: ставка без изменения на 14,0%, риторика стала жёстче",
        "publishedAt": "2026-09-11T00:00:00Z"
      },
      "insights": [{ "id": "u9250-key-rate", "…": "те же поля, что выше" }]
    }
  ]
}
```

- Входят обе вкладки ленты (`direct` и `possible`), скрытые (`dismissed`) — нет.
- `topics` — только темы, где есть выводы. Порядок: больше срочных рисков → больше рисков →
  больше выводов. Внутри темы — как в ленте: срочные первыми, затем по `updatedAt`.
- `materials` — материалы из `bankView.material` (без `page`), по которым есть выводы.
  Свежие сверху, `outdated` — в конце. `supersedes` в разрез не входит.
- Пустые группы не передаются; если выводов нет — пустые массивы.

### Метрики качества: `GET /api/metrics/quality`

Экран «Качество выводов» (`/quality`) для команды и жюри. Считается по всем клиентам.

```json
{
  "generatedAt": "2026-10-21T10:00:00Z",
  "insights": 21,
  "engagement": { "read": 7, "dismissed": 1, "questions": 4 },
  "feedback": {
    "useful": 6,
    "notUseful": 3,
    "comments": [
      {
        "insightId": "u9250-steel",
        "insightTitle": "Металлопрокат дорожает третий месяц…",
        "useful": false,
        "comment": "Оценка банка 2021 года, по стали нужно что-то свежее",
        "at": "2026-10-20T14:36:00Z"
      }
    ]
  },
  "completeness": {
    "withBankView": 19,
    "withSignals": 21,
    "withSelfCheck": 9,
    "withChecks": 21,
    "outdatedBankView": 1
  },
  "reactionMinutes": { "median": 210, "p90": 720 },
  "topics": [{ "topic": "financing", "insights": 5, "useful": 2, "notUseful": 0, "dismissed": 0 }],
  "questions": [
    {
      "insightId": "u9250-key-rate",
      "insightTitle": "ЦБ сохранил ставку 14%…",
      "question": "Что будет при ставке 12%?",
      "at": "2026-10-20T06:36:00Z"
    }
  ]
}
```

- `insights` — сколько выводов выдано; остальные счётчики считаются из этого числа.
- `engagement.read` — статус `read`, `dismissed` — `dismissed`, `questions` — все вопросы
  `POST /api/insights/:id/ask`.
- `feedback` — **последняя** оценка каждого вывода от каждого пользователя: «Полезно», а потом
  комментарий к нему — один голос, не два. `comments` — до 10 последних с текстом, новые сверху.
- `completeness`: `withBankView` — `bankView` на неустаревшем материале; `withSignals` — есть
  `signals`; `withSelfCheck` — в `trace` есть шаг `check`; `withChecks` — непустые `checks`;
  `outdatedBankView` — `bankView.material.outdated`.
- `reactionMinutes` — минуты от последнего сигнала, вышедшего до вывода (самый поздний
  `sources[].publishedAt` или `bankView.material.publishedAt`, не позже `createdAt`), до
  `createdAt`. Медиана и 90-й перцентиль по ближайшему рангу.
- `topics` — только темы, где есть выводы. `questions` — до 10 последних, новые сверху.

### Статус инсайта: `PATCH /api/insights/:id`

Тело: `{ "status": "read" }`. Фронтенд отправляет `read` при открытии карточки, `dismissed` при «Скрыть» и прежний статус при «Отменить». Поле `updatedAt` при смене статуса не меняется: от него зависит порядок ленты.

### Отзыв: `POST /api/insights/:id/feedback`

Тело: `{ "useful": true, "comment": "необязательно, до 2000 символов" }`. Ответ — `204`.

### Вопрос по инсайту: `POST /api/insights/:id/ask`

Тело: `{ "question": "Что будет при ставке 12%?", "role": "cfo" }` — `question` от 1 до 500
символов, `role` необязательная. Ответ:

```json
{
  "question": "Что будет при ставке 12%?",
  "answer": "При ставке 12% процентные расходы по плавающим кредитам снизятся примерно на седьмую часть…",
  "citations": [
    { "kind": "bank", "label": "Ключевая ставка ЦБ РФ, 11.09.2026, с. 1" },
    { "kind": "client", "label": "Профиль клиента: кредиты, лизинг" },
    {
      "kind": "news",
      "label": "Банк России сохранил ключевую ставку",
      "url": "https://example.com/news/1"
    }
  ]
}
```

- `citations` — на что опирается ответ; `url` — если у источника есть ссылка.
- Вопрос не по теме — ответ `200` с объяснением, что сервис отвечает на вопросы об инсайте.
- Ответ может занимать до 30 с (агент ходит в инструменты) — таймаут фронтенда для этого
  запроса 60 с.

**Поток шагов (желательно).** Фронтенд шлёт `Accept: text/event-stream, application/json`.
Бэкенд, который умеет, отвечает `Content-Type: text/event-stream` и присылает шаги агента по
мере работы — пользователь видит их, пока ждёт:

```
event: step
data: {"kind":"plan","title":"Разбираю вопрос: нужны аналитика банка и данные компании"}

event: step
data: {"kind":"tool","title":"Аналитика банка","detail":"Ключевая ставка ЦБ РФ, 11.09.2026"}

event: step
data: {"kind":"check","title":"Сверяю ответ с источниками"}

event: answer
data: {"question":"Что будет при ставке 12%?","answer":"…","citations":[…]}
```

- `step` — тот же `TraceStep`, что в `Insight.trace`: `plan`, `tool`, `check`, `conclusion`.
  Шли настоящие шаги агента в момент, когда он их делает, без внутренних промптов.
- `answer` — `Answer` целиком, последнее событие; после него поток закрывается.
- `error` — `{ "message": "…" }`, если агент упал посреди работы; фронтенд покажет ошибку.
- Не умеете поток — просто отвечайте JSON `Answer`, как выше: фронтенд покажет «Агент готовит
  ответ» без шагов. Выдумывать шаги на фронтенде мы не будем.

### Описание компании: `POST /api/companies/:id/describe`

Тело: `{ "text": "Своими словами о компании…", "links": ["https://example.com/about"] }`.
Пустой текст без ссылок — `400`. В ответе — **новые** факты со статусом `pending`; они же
появляются в `Company.facts`.

### Документы: `POST /api/companies/:id/documents`

`multipart/form-data`, поле `files` — по одному значению на файл. Форматы: PDF, DOCX, TXT;
до 10 МБ на файл. Нарушение — `400` с понятным `message`, например «Файл „Отчёт.xlsx“: допустимы
только PDF, DOCX и TXT». Ответ — как у `describe`.

### Поиск клиента: `GET /api/companies?q=`

`q` — ID клиента, код или название ОКВЭД, регион; без `q` — первые 20 клиентов по выручке.
Для демо достаточно клиентов с выручкой от 15 млрд ₽ — в датасете их 115.

### Факт профиля: `PATCH /api/companies/:id/facts/:factId`

Тело: `{ "status": "confirmed" }`, `{ "statement": "Исправленная формулировка" }` или оба поля.
Пустое тело — `400`. Исправленную формулировку фронтенд присылает вместе с `status: "confirmed"`.
«Подтвердить все» — это отдельный `PATCH` на каждый ожидающий факт, запросы идут параллельно.

### Уведомления

`PUT /api/notifications/settings` принимает объект целиком и возвращает сохранённый вариант:

```json
{
  "telegram": { "connected": true, "username": "demo_director" },
  "urgentKinds": ["risk"],
  "digest": "daily",
  "digestTime": "09:00"
}
```

`digestTime` — `ЧЧ:ММ`, 24 часа. Отключение Telegram — `PUT` с `telegram: { connected: false }`.

`POST /api/notifications/telegram/link` возвращает ссылку на бота с кодом привязки. Пользователь
открывает её, бот подтверждает привязку, а фронтенд узнаёт о ней при следующем
`GET /api/notifications/settings` (настройки перезапрашиваются, когда пользователь возвращается
во вкладку). В моках ссылка — заглушка `https://example.com/telegram-demo`, а привязка
считается подтверждённой сразу.

## Сущности

Полные типы — в `src/schemas/insight.ts`, `src/schemas/company.ts`, `src/schemas/notifications.ts`.

```ts
type Company = {
  id: string; // SYNTHETIC_U: «U_9250»
  name: string; // данные обезличены — «Клиент U_9250»
  inn?: string; // 10 или 12 цифр
  industry: string; // MAINOKVED_NAME
  description: string;
  facts: ProfileFact[];
  profile?: ClientProfile;
};

// Признаки из датасета банка (df_Uid_data_hack.csv и платежи).
type ClientProfile = {
  okved: { code: string; name: string }; // MAINOKVED_CODE, MAINOKVED_NAME
  region: string; // REGION
  city?: string; // CITY
  revenue: number; // REVENUE_COMPANY, ₽
  employees?: string; // AMOUNT_WORKERS_FNS_GRADATION: «Более 251»
  ageYears?: string; // COMPANY_AGE_YEARS_GRADATION: «16-25»
  stage?: string; // ECO_MARK_LABEL
  ownership?: string; // OKFS_NAME
  relationship: 'client' | 'prospect' | 'closed'; // CL_TYPE: CLIENT, PROSPECT, CLOSE_CLIENT
  products: BankProduct[]; // флаги CL_PRODUCT_*_MARK = 1 и FACTORING_MARK = 1
  foreignTrade?: { countries: string[] }; // FTS_FLAG = 1, FTS_COUNTRY_NAME
  group?: { id: string; companies: number }; // GROUP_ID и число компаний в группе
  counterparties: Counterparty[]; // до 5 крупнейших по сумме платежей
};

type BankProduct =
  | 'settlement' // CL_PRODUCT_RKO_MARK
  | 'loan' // CL_PRODUCT_LOA_MARK
  | 'leasing' // CL_PRODUCT_LEA_MARK
  | 'guarantee' // CL_PRODUCT_GAR_MARK
  | 'deposit' // CL_PRODUCT_DEP_MARK
  | 'payroll' // CL_PRODUCT_ZPP_MARK
  | 'factoring'; // FACTORING_MARK

type Counterparty = {
  id: string; // SYNTHETIC_U контрагента
  direction: 'incoming' | 'outgoing'; // клиент — BENEFICIARY или PAYER
  amount: number; // PAY_AMT, ₽
  payments: number; // PAY_CNT
  industry?: string; // ОКВЭД контрагента, если он есть в датасете
};

type ProfileFact = {
  id: string;
  category: FactCategory;
  statement: string;
  status: 'confirmed' | 'pending' | 'rejected';
  source: { kind: 'text' | 'document' | 'link'; label: string };
};
```

## Enum и русские подписи

Подписи живут в `src/shared/labels.ts` — интерфейс берёт их только оттуда.

| Поле                          | Значение       | Подпись                   |
| ----------------------------- | -------------- | ------------------------- |
| `Insight.kind`                | `risk`         | Риск                      |
|                               | `opportunity`  | Возможность               |
| `Insight.urgency`             | `urgent`       | Срочно                    |
|                               | `important`    | Важно                     |
|                               | `info`         | К сведению                |
| `Insight.event.stage`         | `occurred`     | Произошло                 |
|                               | `discussed`    | Обсуждается               |
|                               | `decided`      | Решение принято           |
|                               | `resolved`     | Ситуация разрешилась      |
| `Insight.relevance`           | `direct`       | Прямая связь              |
|                               | `possible`     | Возможная связь           |
| `Insight.topic`               | `financing`    | Ставка и кредиты          |
|                               | `currency`     | Курс рубля                |
|                               | `costs`        | Цены и издержки           |
|                               | `demand`       | Спрос и заказы            |
|                               | `regulation`   | Госрегулирование          |
|                               | `logistics`    | Логистика и экспорт       |
| `Insight.status`              | `new`          | Новое                     |
|                               | `read`         | Прочитано                 |
|                               | `dismissed`    | Скрыто                    |
| `ImpactStep.role`             | `event`        | Событие                   |
|                               | `place`        | Место                     |
|                               | `asset`        | Площадка                  |
|                               | `supply`       | Поставка                  |
|                               | `counterparty` | Контрагент                |
|                               | `market`       | Рынок                     |
|                               | `company`      | Ваша компания             |
| `ProfileFact.category`        | `supplier`     | Поставщики                |
|                               | `customer`     | Клиенты                   |
|                               | `site`         | Площадки и склады         |
|                               | `region`       | Регионы                   |
|                               | `product`      | Продукция                 |
|                               | `logistics`    | Логистика                 |
|                               | `finance`      | Финансы                   |
|                               | `other`        | Другое                    |
| `ProfileFact.status`          | `confirmed`    | Подтверждено              |
|                               | `pending`      | Ждёт подтверждения        |
|                               | `rejected`     | Отклонено                 |
| `ProfileFact.source.kind`     | `text`         | Описание                  |
|                               | `document`     | Документ                  |
|                               | `link`         | Ссылка                    |
| `ClientProfile.relationship`  | `client`       | Клиент банка              |
|                               | `prospect`     | Потенциальный клиент      |
|                               | `closed`       | Бывший клиент             |
| `BankProduct`                 | `settlement`   | Расчётный счёт            |
|                               | `loan`         | Кредиты                   |
|                               | `leasing`      | Лизинг                    |
|                               | `guarantee`    | Банковские гарантии       |
|                               | `deposit`      | Депозиты                  |
|                               | `payroll`      | Зарплатный проект         |
|                               | `factoring`    | Факторинг                 |
| `TraceStep.kind`              | `plan`         | План                      |
|                               | `tool`         | Данные                    |
|                               | `check`        | Проверка                  |
|                               | `conclusion`   | Вывод                     |
| `Citation.kind`               | `news`         | Новость                   |
|                               | `bank`         | Аналитика Альфа-Банка     |
|                               | `client`       | Данные клиента            |
| `role`                        | `owner`        | Собственник               |
|                               | `ceo`          | Генеральный директор      |
|                               | `cfo`          | Финансовый директор       |
|                               | `accountant`   | Главный бухгалтер         |
|                               | `treasurer`    | Руководитель казначейства |
|                               | `other`        | Другая роль               |
| `NotificationSettings.digest` | `daily`        | Каждый день               |
|                               | `weekly`       | Раз в неделю              |
|                               | `off`          | Не присылать              |

## Моки

- Включаются `VITE_USE_MOCKS=true`. MSW перехватывает запросы к `VITE_API_URL` в браузере, поэтому переход на настоящий бэкенд — это `VITE_USE_MOCKS=false` и правильный `VITE_API_URL`.
- Данные: четыре клиента из датасета кейса (U_9250, U_34911, U_26030, U_1465) и 21 инсайт.
  Позиция банка — короткие выжимки из материалов кейса с названием, датой и страницей. Новости
  вымышлены, помечены «(тестовые данные)» и ведут на `example.com`. Контрагенты — реальные
  из `df_Uid_payment_hack.csv`: по два крупнейших получателя и плательщика, без переводов
  самому себе.
- Есть примеры пересмотренной оценки банка (`supersedes`) и устаревшего материала (`outdated`).
- Задержка ответов 300–800 мс. Добавьте `?mock=errors` к адресу страницы — все запросы вернут `500`.
- Состояние (прочитанные, скрытые, подтверждённые факты, настройки) хранится в `sessionStorage` вкладки: переживает перезагрузку, а новая вкладка начинает с исходных данных.
