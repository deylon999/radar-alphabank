# Сценарий использования: завершение несуществующей сессии.
# Проверяет: неизвестный ID отвечает 404 /problems/session-not-found, текущая сессия продолжает работать.

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

# Пытаемся завершить сессию, которой нет.
DELETE {{base_url}}/auth/sessions/{{newUuid}}
X-CSRF-TOKEN: {{csrf_token}}
HTTP 404
[Asserts]
header "Content-Type" contains "application/problem+json"
jsonpath "$.type" == "/problems/session-not-found"

# Текущая сессия не затронута.
GET {{base_url}}/auth/sessions
HTTP 200
