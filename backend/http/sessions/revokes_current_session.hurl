# Сценарий использования: завершение своей сессии по публичному ID.
# Проверяет: завершение текущей сессии отвечает 204 и удаляет cookie, после него вход недействителен.

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

# Берём публичный ID текущей сессии.
GET {{base_url}}/auth/sessions
HTTP 200
[Captures]
session_id: jsonpath "$.sessions[0].id"

# Завершаем текущую сессию.
DELETE {{base_url}}/auth/sessions/{{session_id}}
X-CSRF-TOKEN: {{csrf_token}}
HTTP 204
[Asserts]
cookie "SESSION[Max-Age]" == 0

# Сессия больше не даёт входа.
GET {{base_url}}/auth/sessions
HTTP 401
