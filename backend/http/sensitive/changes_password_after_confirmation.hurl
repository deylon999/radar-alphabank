# Сценарий использования: смена пароля.
# Проверяет: без подтверждения личности смена пароля отклоняется (403), после подтверждения
# пароль меняется (204, новая cookie), старый пароль больше не подходит, а новый подходит.

# Получаем сессию и CSRF-токен, задаём уникальный email.
GET {{base_url}}/auth/csrf
[Options]
variable: email=hurl-{{newUuid}}@example.com
HTTP 200
[Captures]
csrf_token: jsonpath "$.token"

# Регистрируемся.
POST {{base_url}}/auth/register
X-CSRF-TOKEN: {{csrf_token}}
{
    "email": "{{email}}",
    "password": "My company has useful news"
}
HTTP 201

# Входим.
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

# Без подтверждения личности сменить пароль нельзя.
PATCH {{base_url}}/auth/password
X-CSRF-TOKEN: {{csrf_token}}
{
    "newPassword": "Another long company passphrase"
}
HTTP 403
[Asserts]
jsonpath "$.type" == "/problems/reauthentication-required"

# Подтверждаем личность текущим паролем.
POST {{base_url}}/auth/reauthenticate
X-CSRF-TOKEN: {{csrf_token}}
{
    "password": "My company has useful news"
}
HTTP 200
[Asserts]
jsonpath "$.confirmedAt" exists
jsonpath "$.validUntil" exists

# Меняем пароль: сервер выдаёт новую cookie текущей сессии.
PATCH {{base_url}}/auth/password
X-CSRF-TOKEN: {{csrf_token}}
{
    "newPassword": "Another long company passphrase"
}
HTTP 204
[Asserts]
cookie "SESSION" exists

# После смены пароля нужен новый CSRF-токен.
GET {{base_url}}/auth/csrf
HTTP 200
[Captures]
csrf_token: jsonpath "$.token"

# Выходим, чтобы проверить пароли при новом входе.
POST {{base_url}}/auth/logout
X-CSRF-TOKEN: {{csrf_token}}
HTTP 204

# Получаем анонимную сессию.
GET {{base_url}}/auth/csrf
HTTP 200
[Captures]
csrf_token: jsonpath "$.token"

# Старый пароль больше не подходит.
POST {{base_url}}/auth/login
X-CSRF-TOKEN: {{csrf_token}}
{
    "email": "{{email}}",
    "password": "My company has useful news"
}
HTTP 401
[Asserts]
jsonpath "$.type" == "/problems/invalid-credentials"

# Новый пароль подходит.
POST {{base_url}}/auth/login
X-CSRF-TOKEN: {{csrf_token}}
{
    "email": "{{email}}",
    "password": "Another long company passphrase"
}
HTTP 200
