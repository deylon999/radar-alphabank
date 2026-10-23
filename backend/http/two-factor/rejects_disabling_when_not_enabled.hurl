# Сценарий использования: отключение 2FA.
# Проверяет: у пользователя без 2FA отключать нечего, сервер отвечает 409 two-factor-not-enabled
# ещё до проверки пароля и кода.

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

# Пытаемся отключить невключённую 2FA.
POST {{base_url}}/auth/2fa/disable
X-CSRF-TOKEN: {{csrf_token}}
{
    "password": "My company has useful news",
    "secondFactor": {
        "method": "totp",
        "code": "123456"
    }
}
HTTP 409
[Asserts]
jsonpath "$.type" == "/problems/two-factor-not-enabled"
