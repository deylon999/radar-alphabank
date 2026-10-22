# Сценарий использования: регистрация с распространённым паролем.
# Проверяет: пароль из списка утечек отвечает 422 с кодом COMPROMISED_PASSWORD.

# Получаем анонимную сессию и CSRF-токен.
GET {{base_url}}/auth/csrf
HTTP 200
[Captures]
csrf_token: jsonpath "$.token"

# Регистрируемся с паролем из списка утечек.
POST {{base_url}}/auth/register
X-CSRF-TOKEN: {{csrf_token}}
{
    "email": "hurl-{{newUuid}}@example.com",
    "password": "1q2w3e4r5t6y7u8i"
}
HTTP 422
[Asserts]
jsonpath "$.errors[0].field" == "password"
jsonpath "$.errors[0].title" == "COMPROMISED_PASSWORD"
