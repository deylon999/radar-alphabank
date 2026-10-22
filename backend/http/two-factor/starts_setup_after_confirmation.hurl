# Сценарий использования: настройка TOTP.
# Проверяет: без подтверждения личности настройка не начинается (403); после подтверждения
# сервер выдаёт секрет в Base32 и URI для QR-кода на 5 минут, а сама 2FA остаётся выключенной.
# Включение первым кодом здесь не проверяется: Hurl не умеет вычислять HMAC для TOTP,
# этот путь покрывают тесты JUnit.

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

# Входим: без 2FA вход завершается сразу.
POST {{base_url}}/auth/login
X-CSRF-TOKEN: {{csrf_token}}
{
    "email": "{{email}}",
    "password": "My company has useful news"
}
HTTP 200
[Asserts]
jsonpath "$.status" == "authenticated"
jsonpath "$.user.twoFactorEnabled" == false

# После входа получаем новый CSRF-токен.
GET {{base_url}}/auth/csrf
HTTP 200
[Captures]
csrf_token: jsonpath "$.token"

# Без подтверждения личности настройку начать нельзя.
POST {{base_url}}/auth/2fa/setup
X-CSRF-TOKEN: {{csrf_token}}
HTTP 403
[Asserts]
jsonpath "$.type" == "/problems/reauthentication-required"

# Подтверждаем личность паролем.
POST {{base_url}}/auth/reauthenticate
X-CSRF-TOKEN: {{csrf_token}}
{
    "password": "My company has useful news"
}
HTTP 200

# Начинаем настройку: секрет и URI выдаются только в этом ответе.
POST {{base_url}}/auth/2fa/setup
X-CSRF-TOKEN: {{csrf_token}}
HTTP 200
[Asserts]
header "Cache-Control" == "no-store"
jsonpath "$.secret" matches "^[A-Z2-7]{32}$"
jsonpath "$.provisioningUri" startsWith "otpauth://totp/Radar:"
jsonpath "$.provisioningUri" contains "issuer=Radar"
jsonpath "$.expiresAt" exists

# Настройка сама 2FA не включает.
GET {{base_url}}/me
HTTP 200
[Asserts]
jsonpath "$.user.twoFactorEnabled" == false
