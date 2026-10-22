# Сценарий использования: клиент открывает приложение и получает CSRF-токен до входа.
# Проверяет: без сессии сервер создаёт анонимную сессию, выдаёт токен
# и ставит cookie SESSION с атрибутами из контракта; повторный запрос
# в той же сессии новую cookie не ставит.

# Первый запрос без cookie: сервер создаёт анонимную сессию и выдаёт токен.
GET {{base_url}}/auth/csrf
HTTP 200
[Asserts]
header "Content-Type" contains "application/json"
header "Cache-Control" == "no-store"
jsonpath "$.token" isString
jsonpath "$.headerName" == "X-CSRF-TOKEN"
cookie "SESSION" exists
cookie "SESSION[Secure]" exists
cookie "SESSION[HttpOnly]" exists
cookie "SESSION[SameSite]" == "Lax"
cookie "SESSION[Path]" == "/"
cookie "SESSION[Domain]" not exists

# Повторный запрос уже с cookie SESSION: токен той же сессии, без новой cookie.
GET {{base_url}}/auth/csrf
HTTP 200
[Asserts]
header "Set-Cookie" not exists
jsonpath "$.token" isString
