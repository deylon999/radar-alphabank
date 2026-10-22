# Сценарий использования: список своих сессий.
# Проверяет: после входа в списке одна текущая сессия с публичным UUID и временем входа.

# Получаем анонимную сессию и CSRF-токен.
GET {{base_url}}/auth/csrf
[Options]
variable: email=hurl-{{newUuid}}@example.com
HTTP 200
[Captures]
csrf_token: jsonpath "$.token"

# Регистрируем пользователя.
POST {{base_url}}/auth/register
X-CSRF-TOKEN: {{csrf_token}}
{
    "email": "{{email}}",
    "password": "My company has useful news"
}
HTTP 201

# Входим: сервер меняет cookie сессии.
POST {{base_url}}/auth/login
X-CSRF-TOKEN: {{csrf_token}}
{
    "email": "{{email}}",
    "password": "My company has useful news"
}
HTTP 200

# После входа получаем новый CSRF-токен.
GET {{base_url}}/auth/csrf
HTTP 200
[Captures]
csrf_token: jsonpath "$.token"

# Смотрим свои сессии.
GET {{base_url}}/auth/sessions
User-Agent: Mozilla/5.0 (X11; Linux x86_64) Chrome/141.0.0.0 Safari/537.36
HTTP 200
[Asserts]
header "Cache-Control" == "no-store"
jsonpath "$.sessions" count == 1
jsonpath "$.sessions[0].current" == true
jsonpath "$.sessions[0].id" matches /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
jsonpath "$.sessions[0].authenticatedAt" exists
jsonpath "$.sessions[0].lastAccessedAt" exists
