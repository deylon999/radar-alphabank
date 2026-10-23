# Сценарий использования: регистрация с ошибкой в email.
# Проверяет: некорректный email отвечает 422 с ошибкой поля email и кодом INVALID_FORMAT.

# Получаем анонимную сессию и CSRF-токен.
GET {{base_url}}/auth/csrf
HTTP 200
[Captures]
csrf_token: jsonpath "$.token"

# Регистрируемся с email без домена.
POST {{base_url}}/auth/register
X-CSRF-TOKEN: {{csrf_token}}
{
    "email": "ivan@",
    "password": "My company has useful news"
}
HTTP 422
[Asserts]
header "Content-Type" contains "application/problem+json"
jsonpath "$.type" == "/problems/validation-failed"
jsonpath "$.errors[0].field" == "email"
jsonpath "$.errors[0].title" == "INVALID_FORMAT"
