# Сценарий использования: выход.
# Проверяет: выход отвечает 204 и удаляет cookie SESSION, после него защищённая операция отвечает 401.

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

# Выходим: сервер завершает сессию и удаляет cookie.
POST {{base_url}}/auth/logout
X-CSRF-TOKEN: {{csrf_token}}
HTTP 204
[Asserts]
cookie "SESSION" == ""
cookie "SESSION[Max-Age]" == 0
cookie "SESSION[Path]" == "/"

# Список сессий после выхода недоступен.
GET {{base_url}}/auth/sessions
HTTP 401
[Asserts]
jsonpath "$.type" == "/problems/authentication-required"
