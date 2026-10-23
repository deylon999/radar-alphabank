# Сценарий использования: включение TOTP.
# Проверяет: без настройки, начатой в текущей сессии, код не принимается и сервер отвечает 409
# totp-setup-expired; 2FA остаётся выключенной.

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

# Подтверждаем личность паролем.
POST {{base_url}}/auth/reauthenticate
X-CSRF-TOKEN: {{csrf_token}}
{
    "password": "My company has useful news"
}
HTTP 200

# Отправляем код без начатой настройки.
POST {{base_url}}/auth/2fa/enable
X-CSRF-TOKEN: {{csrf_token}}
{
    "code": "123456"
}
HTTP 409
[Asserts]
header "Content-Type" == "application/problem+json"
jsonpath "$.type" == "/problems/totp-setup-expired"

# 2FA по-прежнему выключена.
GET {{base_url}}/me
HTTP 200
[Asserts]
jsonpath "$.user.twoFactorEnabled" == false
