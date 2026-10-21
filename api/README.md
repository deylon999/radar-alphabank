# API

Контракт API на TypeSpec. Пока здесь только авторизация: вход, сессии, CSRF и 2FA.

## Что где лежит

- `main.tsp` — точка входа, тут описан сам сервис;
- `common/` — общие вещи: ошибки в формате Problem Details, ответы, CSRF, cookie сессии;
- `auth/` — авторизация: `operations/` с эндпойнтами и `model/` с запросами, ответами и ошибками.

## Сборка

```bash
npm install
sh compile.sh
```

Скрипт запускает `tsp compile` с `--warn-as-error`, так что любое предупреждение ломает сборку.

Готовая OpenAPI-спецификация (3.1.0) появится в `tsp-output/schema/openapi.yaml`.