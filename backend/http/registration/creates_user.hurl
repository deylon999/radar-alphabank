# Сценарий использования: регистрация нового пользователя.
# Проверяет: регистрация с корректным email и паролем отвечает 201 и возвращает только UUID.

# Получаем анонимную сессию и CSRF-токен.
GET {{base_url}}/auth/csrf
HTTP 200
[Captures]
csrf_token: jsonpath "$.token"

# Регистрируемся с уникальным email.
POST {{base_url}}/auth/register
X-CSRF-TOKEN: {{csrf_token}}
{
    "email": "hurl-{{newUuid}}@example.com",
    "password": "My company has useful news"
}
HTTP 201
[Asserts]
header "Cache-Control" == "no-store"
jsonpath "$.id" matches /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
jsonpath "$.password" not exists
