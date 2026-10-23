# Сценарий использования: завершение остальных сессий.
# Проверяет: если других сессий нет, ответ всё равно 204, а текущая сессия сохраняется.

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

# Завершаем остальные сессии.
POST {{base_url}}/auth/sessions/revoke-others
X-CSRF-TOKEN: {{csrf_token}}
HTTP 204

# Текущая сессия продолжает работать.
GET {{base_url}}/auth/sessions
HTTP 200
[Asserts]
jsonpath "$.sessions" count == 1
