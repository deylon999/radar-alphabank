# Сценарий использования: регистрация не выполняет вход.
# Проверяет: после регистрации сессия остаётся анонимной, защищённая операция отвечает 401.

# Получаем анонимную сессию и CSRF-токен.
GET {{base_url}}/auth/csrf
HTTP 200
[Captures]
csrf_token: jsonpath "$.token"

# Регистрируемся.
POST {{base_url}}/auth/register
X-CSRF-TOKEN: {{csrf_token}}
{
    "email": "hurl-{{newUuid}}@example.com",
    "password": "My company has useful news"
}
HTTP 201

# Выход требует входа: в той же сессии получаем 401.
POST {{base_url}}/auth/logout
X-CSRF-TOKEN: {{csrf_token}}
HTTP 401
[Asserts]
jsonpath "$.type" == "/problems/authentication-required"
