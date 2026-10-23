# Радар

Хакатон Альфа-Банка, трек «Новостная аналитика для принятия бизнес-решений».

| Каталог                  | Что внутри                                                 |
| ------------------------ | ---------------------------------------------------------- |
| [`frontend/`](frontend/) | веб-приложение: React, TypeScript, моки API, Docker, тесты |
| [`api/`](api/)           | API-спецификация: TypeSpec                                 |
| [`bot/`](bot/)           | Telegram-бот: привязка аккаунта, срочные инсайты и сводка  |
| [`ml/`](ml/)             | ML-сервис: профиль компании, новости, аналитика банка, агент |

Описание, запуск и сценарий проверки — в [`frontend/README.md`](frontend/README.md).
Договор API — спецификация [`api/`](api/) на TypeSpec; что важно фронтенду — в
[`frontend/docs/api-contract.md`](frontend/docs/api-contract.md).

Как вносить изменения: ветки, pull request, формат коммитов — [`CONTRIBUTING.md`](CONTRIBUTING.md).

ML-сервис: как работает, запуск, метрики и безопасность — [`ml/README.md`](ml/README.md);
как бэкенд его вызывает — [`ml/docs/integration.md`](ml/docs/integration.md).
