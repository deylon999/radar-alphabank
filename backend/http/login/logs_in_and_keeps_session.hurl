# Сценарий использования: вход по email и паролю.
# Проверяет: вход отвечает 200 с описанием входа и новой cookie SESSION,
# а повторный вход в той же сессии отвечает 409: пользователь уже вошёл.

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
[Captures]
user_id: jsonpath "$.id"

# Входим: сервер меняет ID сессии и ставит новую cookie.
POST {{base_url}}/auth/login
X-CSRF-TOKEN: {{csrf_token}}
{
    "email": "{{email}}",
    "password": "My company has useful news"
}
HTTP 200
[Asserts]
cookie "SESSION" exists
cookie "SESSION[HttpOnly]" exists
jsonpath "$.status" == "authenticated"
jsonpath "$.user.id" == "{{user_id}}"
jsonpath "$.user.email" == "{{email}}"
jsonpath "$.user.twoFactorEnabled" == false
jsonpath "$.idleTimeoutSeconds" == 3600

# После входа нужен новый CSRF-токен.
GET {{base_url}}/auth/csrf
HTTP 200
[Captures]
csrf_token: jsonpath "$.token"

# Повторный вход в той же сессии: пользователь уже вошёл.
POST {{base_url}}/auth/login
X-CSRF-TOKEN: {{csrf_token}}
{
    "email": "{{email}}",
    "password": "My company has useful news"
}
HTTP 409
[Asserts]
jsonpath "$.type" == "/problems/invalid-security-state"
