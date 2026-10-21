# THIRD_PARTY_NOTICES — фронтенд «Радара»

Сторонние компоненты, данные, материалы и смоделированные интеграции, которые использует
фронтенд. Версии — точные, как в `package.json` и `package-lock.json`.

Правила хакатона требуют указывать авторов чужих разработок. Все библиотеки — открытые.

### В сборке приложения

| Библиотека                    | Версия  | Лицензия | Автор                       |
| ----------------------------- | ------- | -------- | --------------------------- |
| `@alfalab/core-components`    | 50.35.1 | MIT      | Альфа-Банк (core-ds)        |
| `@alfalab/icons-glyph`        | 2.293.0 | MIT      | Альфа-Банк (core-ds)        |
| `react`, `react-dom`          | 19.3.1  | MIT      | Meta Platforms и сообщество |
| `react-router`                | 8.4.0   | MIT      | Remix Software              |
| `@tanstack/react-query`       | 5.104.4 | MIT      | Tanner Linsley              |
| `zod`                         | 4.6.7   | MIT      | Colin McDonnell             |
| `classnames`                  | 2.5.1   | MIT      | Jed Watson                  |
| `msw` (только в режиме моков) | 3.0.3   | MIT      | Artem Zakharchenko          |

### Инструменты разработки и тестирования

| Библиотека                                        | Версия  | Лицензия   | Автор                              |
| ------------------------------------------------- | ------- | ---------- | ---------------------------------- |
| `vite`                                            | 8.3.4   | MIT        | Evan You                           |
| `@vitejs/plugin-react`                            | 6.1.2   | MIT        | Evan You                           |
| `typescript`                                      | 6.0.3   | Apache-2.0 | Microsoft                          |
| `vitest`                                          | 5.0.5   | MIT        | Anthony Fu и команда Vitest        |
| `jsdom`                                           | 30.1.3  | MIT        | Elijah Insua                       |
| `@testing-library/react`                          | 16.3.3  | MIT        | Kent C. Dodds                      |
| `@testing-library/dom`                            | 10.4.2  | MIT        | Kent C. Dodds                      |
| `@testing-library/jest-dom`                       | 7.0.1   | MIT        | Ernesto García                     |
| `@testing-library/user-event`                     | 14.6.8  | MIT        | Giorgio Polvara                    |
| `@playwright/test`                                | 1.64.1  | Apache-2.0 | Microsoft                          |
| `@axe-core/playwright`                            | 4.14.0  | MPL-2.0    | Deque Systems                      |
| `eslint`                                          | 10.13.0 | MIT        | Nicholas C. Zakas и команда ESLint |
| `@eslint/js`                                      | 10.0.1  | MIT        | команда ESLint                     |
| `typescript-eslint`                               | 8.71.2  | MIT        | команда typescript-eslint          |
| `eslint-plugin-react-hooks`                       | 7.1.1   | MIT        | Meta Platforms                     |
| `eslint-plugin-jsx-a11y`                          | 6.10.2  | MIT        | Ethan Cohen                        |
| `eslint-config-prettier`                          | 10.1.8  | MIT        | Simon Lydell                       |
| `prettier`                                        | 3.9.10  | MIT        | James Long и команда Prettier      |
| `globals`                                         | 17.13.0 | MIT        | Sindre Sorhus                      |
| `@types/node`, `@types/react`, `@types/react-dom` | —       | MIT        | DefinitelyTyped                    |

### Образы Docker

| Образ               | Назначение                | Лицензия                       |
| ------------------- | ------------------------- | ------------------------------ |
| `node:24-alpine`    | сборка (`npm ci`, `vite`) | MIT (Node.js), Alpine — разные |
| `nginx:1.27-alpine` | раздача собранного сайта  | BSD-2-Clause (nginx)           |

### Шрифт

Styrene A LC (`src/assets/fonts`) — гарнитура Commercial Type, файлы предоставлены командой.
Условия использования определяет владелец лицензии; в репозитории файлы не изменялись.

### Данные и материалы кейса

Клиенты в `src/mocks` — четыре компании из обезличенного датасета кейса (`df_Uid_data_hack.csv`)
с их признаками; контрагенты и суммы платежей — из `df_Uid_payment_hack.csv`. Факты «со слов
компании» синтетические. Новости
вымышлены и помечены «(тестовые данные)», ссылки ведут на `example.com`. Позиция банка — короткие
выжимки из аналитических материалов Альфа-Банка с названием и датой материала; сами материалы
принадлежат банку и в репозиторий не входят.

### Смоделированные интеграции

| Что                      | Где                                     | Как устроено                                                                          |
| ------------------------ | --------------------------------------- | ------------------------------------------------------------------------------------- |
| API бэкенда              | `src/mocks/handlers.ts`                 | MSW перехватывает запросы в браузере по договору `docs/api-contract.md`               |
| Ответы агента на вопросы | `answerQuestion` в `src/mocks/logic.ts` | ответ собирается из полей инсайта; настоящий готовит агент бэкенда                    |
| Разбор описания и файлов | `src/mocks/logic.ts`                    | каждое предложение — факт на подтверждение; настоящий разбор делает бэкенд            |
| Главная Альфа-Бизнеса    | `src/features/business`                 | упрощённая оболочка интернет-банка для точки входа; остаток на счёте демонстрационный |
| Привязка Telegram        | `src/mocks/handlers.ts`                 | ссылка-заглушка `example.com`; настоящую выдаёт бэкенд, привязку подтверждает бот     |

Модели LLM фронтенд не вызывает: все выводы приходят от бэкенда через API.
