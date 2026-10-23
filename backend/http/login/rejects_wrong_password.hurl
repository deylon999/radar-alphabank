# Сценарий использования: вход с неверным паролем.
# Проверяет: неверный пароль отвечает 401 /problems/invalid-credentials.

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

# Входим с неверным паролем.
POST {{base_url}}/auth/login
X-CSRF-TOKEN: {{csrf_token}}
{
    "email": "{{email}}",
    "password": "Wrong long passphrase here"
}
HTTP 401
[Asserts]
header "Content-Type" contains "application/problem+json"
jsonpath "$.type" == "/problems/invalid-credentials"
