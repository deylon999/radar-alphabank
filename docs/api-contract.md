# Контракт API «Радара»

Черновик фронтенда до выдачи данных кейса. Источник правды — zod-схемы в `src/schemas/`:
фронтенд проверяет каждый ответ, и всё, что не совпадает с контрактом, показывает как ошибку.
Если меняется формат — правим схемы, моки (`src/mocks/`) и этот файл вместе.

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
| GET   | `/api/companies`                   | `Company[]` — переключатель компаний для демо      |
| GET   | `/api/companies/:id`               | `Company`                                          |
| POST  | `/api/companies/:id/describe`      | `{ facts: ProfileFact[] }`                         |
| POST  | `/api/companies/:id/documents`     | `{ facts: ProfileFact[] }`                         |
| PATCH | `/api/companies/:id/facts/:factId` | `ProfileFact`                                      |
| GET   | `/api/companies/:id/insights`      | `{ items: Insight[], nextCursor: string \| null }` |
| GET   | `/api/companies/:id/digest`        | `Digest`                                           |
| GET   | `/api/insights/:id`                | `Insight`                                          |
| PATCH | `/api/insights/:id`                | `Insight`                                          |
| POST  | `/api/insights/:id/feedback`       | `204 No Content`                                   |
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
| `cursor`    | значение `nextCursor` из предыдущей страницы                                | `?cursor=offset:10`           |

- Несколько значений одного параметра объединяются через «или», разные параметры — через «и».
- Неизвестное значение enum — ответ `400`.
- **Порядок:** сначала `urgency = urgent`, затем по `updatedAt`, новые выше.
- Инсайты со статусом `dismissed` в ленту не попадают.
- Размер страницы — на усмотрение бэкенда (в моках 6). Курсор непрозрачный: фронтенд его не разбирает.

Пример ответа:

```json
{
  "items": [
    {
      "id": "agro-flood",
      "companyId": "polevea-agro",
      "kind": "risk",
      "urgency": "urgent",
      "relevance": "direct",
      "status": "new",
      "title": "Паводок в Заречном районе: вода подошла к складской зоне",
      "whyItMatters": "Склад «Южный-2» в зоне паводка — под угрозой поставка упаковки на маслозавод",
      "event": {
        "title": "Паводок в Заречном районе",
        "stage": "occurred",
        "occurredAt": "2026-10-17T19:00:00Z",
        "place": "Заречный район, Приречная область"
      },
      "impactPath": [
        { "label": "Паводок в Заречном районе", "role": "event" },
        { "label": "Склад «Южный-2»", "role": "asset" },
        { "label": "Поставка упаковки", "role": "supply" },
        { "label": "Полевея Агро", "role": "company" }
      ],
      "consequence": "Задержка поставки упаковки на маслозавод на 2–4 дня и простой линии розлива",
      "basis": ["Склад «Южный-2» находится в Заречном районе"],
      "unknowns": [
        "Работает ли сам склад: оператор сообщил о возобновлении работы, отгрузки не подтверждены"
      ],
      "checks": ["Запросить у склада статус отгрузки упаковки на сегодня и завтра"],
      "sources": [
        {
          "id": "agro-flood-s1",
          "title": "В Заречном районе введён режим чрезвычайной ситуации",
          "publisher": "Официальные сообщения (тестовые данные)",
          "url": "https://example.com/news/agro-flood-1",
          "publishedAt": "2026-10-17T20:00:00Z"
        }
      ],
      "createdAt": "2026-10-17T21:00:00Z",
      "updatedAt": "2026-10-18T08:20:00Z",
      "revisions": [
        { "at": "2026-10-18T08:20:00Z", "note": "Склад возобновил работу по данным оператора" }
      ]
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

### Сводка: `GET /api/companies/:id/digest`

```json
{ "since": "2026-10-11T00:00:00Z", "urgentRisks": 1, "risks": 6, "opportunities": 4 }
```

- Считаются только инсайты с `relevance = direct` — вкладка «Главное». «Под наблюдением» в сводку не входит.
- `risks` — **все** риски с даты `since`, включая срочные. Так число совпадает с лентой при фильтре «Риски».
- `urgentRisks` — срочные риски (они же входят в `risks`).
- Скрытые (`dismissed`) инсайты не считаются. В моках период — 7 дней.

### Статус инсайта: `PATCH /api/insights/:id`

Тело: `{ "status": "read" }`. Фронтенд отправляет `read` при открытии карточки, `dismissed` при «Скрыть» и прежний статус при «Отменить». Поле `updatedAt` при смене статуса не меняется: от него зависит порядок ленты.

### Отзыв: `POST /api/insights/:id/feedback`

Тело: `{ "useful": true, "comment": "необязательно, до 2000 символов" }`. Ответ — `204`.

### Описание компании: `POST /api/companies/:id/describe`

Тело: `{ "text": "Своими словами о компании…", "links": ["https://example.com/about"] }`.
Пустой текст без ссылок — `400`. В ответе — **новые** факты со статусом `pending`; они же
появляются в `Company.facts`.

### Документы: `POST /api/companies/:id/documents`

`multipart/form-data`, поле `files` — по одному значению на файл. Форматы: PDF, DOCX, TXT;
до 10 МБ на файл. Нарушение — `400` с понятным `message`, например «Файл „Отчёт.xlsx“: допустимы
только PDF, DOCX и TXT». Ответ — как у `describe`.

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
  id: string;
  name: string;
  inn?: string; // 10 или 12 цифр
  industry: string;
  description: string;
  facts: ProfileFact[];
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

| Поле                          | Значение       | Подпись              |
| ----------------------------- | -------------- | -------------------- |
| `Insight.kind`                | `risk`         | Риск                 |
|                               | `opportunity`  | Возможность          |
| `Insight.urgency`             | `urgent`       | Срочно               |
|                               | `important`    | Важно                |
|                               | `info`         | К сведению           |
| `Insight.event.stage`         | `occurred`     | Произошло            |
|                               | `discussed`    | Обсуждается          |
|                               | `decided`      | Решение принято      |
|                               | `resolved`     | Ситуация разрешилась |
| `Insight.relevance`           | `direct`       | Прямая связь         |
|                               | `possible`     | Возможная связь      |
| `Insight.status`              | `new`          | Новое                |
|                               | `read`         | Прочитано            |
|                               | `dismissed`    | Скрыто               |
| `ImpactStep.role`             | `event`        | Событие              |
|                               | `place`        | Место                |
|                               | `asset`        | Площадка             |
|                               | `supply`       | Поставка             |
|                               | `counterparty` | Контрагент           |
|                               | `market`       | Рынок                |
|                               | `company`      | Ваша компания        |
| `ProfileFact.category`        | `supplier`     | Поставщики           |
|                               | `customer`     | Клиенты              |
|                               | `site`         | Площадки и склады    |
|                               | `region`       | Регионы              |
|                               | `product`      | Продукция            |
|                               | `logistics`    | Логистика            |
|                               | `finance`      | Финансы              |
|                               | `other`        | Другое               |
| `ProfileFact.status`          | `confirmed`    | Подтверждено         |
|                               | `pending`      | Ждёт подтверждения   |
|                               | `rejected`     | Отклонено            |
| `ProfileFact.source.kind`     | `text`         | Описание             |
|                               | `document`     | Документ             |
|                               | `link`         | Ссылка               |
| `NotificationSettings.digest` | `daily`        | Каждый день          |
|                               | `weekly`       | Раз в неделю         |
|                               | `off`          | Не присылать         |

## Моки

- Включаются `VITE_USE_MOCKS=true`. MSW перехватывает запросы к `VITE_API_URL` в браузере, поэтому переход на настоящий бэкенд — это `VITE_USE_MOCKS=false` и правильный `VITE_API_URL`.
- Данные: три вымышленные компании и 28 инсайтов, все источники помечены «(тестовые данные)» и ведут на `example.com`.
- Задержка ответов 300–800 мс. Добавьте `?mock=errors` к адресу страницы — все запросы вернут `500`.
- Состояние (прочитанные, скрытые, подтверждённые факты, настройки) хранится в `sessionStorage` вкладки: переживает перезагрузку, а новая вкладка начинает с исходных данных.
