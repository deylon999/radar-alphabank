# Сценарий использования: вход с несуществующим email.
# Проверяет: ответ тот же, что при неверном пароле (401 /problems/invalid-credentials),
# поэтому по нему нельзя узнать, существует ли аккаунт.

# Получаем анонимную сессию и CSRF-токен.
GET {{base_url}}/auth/csrf
HTTP 200
[Captures]
csrf_token: jsonpath "$.token"

# Входим с email, которого нет.
POST {{base_url}}/auth/login
X-CSRF-TOKEN: {{csrf_token}}
{
    "email": "nobody-{{newUuid}}@example.com",
    "password": "My company has useful news"
}
HTTP 401
[Asserts]
jsonpath "$.type" == "/problems/invalid-credentials"
