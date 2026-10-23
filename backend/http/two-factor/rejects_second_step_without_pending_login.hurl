# Сценарий использования: вход с 2FA, второй шаг.
# Проверяет: без проверенного пароля в текущей сессии второй шаг невозможен — сервер отвечает
# 401 pending-login-required, а неизвестный способ подтверждения даёт 422 INVALID_ENUM_VALUE.

# Получаем анонимную сессию и CSRF-токен.
GET {{base_url}}/auth/csrf
HTTP 200
[Captures]
csrf_token: jsonpath "$.token"

# Отправляем второй шаг без первого.
POST {{base_url}}/auth/login/2fa
X-CSRF-TOKEN: {{csrf_token}}
{
    "method": "totp",
    "code": "123456"
}
HTTP 401
[Asserts]
header "Content-Type" == "application/problem+json"
jsonpath "$.type" == "/problems/pending-login-required"

# Неизвестный способ подтверждения — ошибка поля method.
POST {{base_url}}/auth/login/2fa
X-CSRF-TOKEN: {{csrf_token}}
{
    "method": "sms",
    "code": "123456"
}
HTTP 422
[Asserts]
jsonpath "$.errors[0].field" == "method"
jsonpath "$.errors[0].title" == "INVALID_ENUM_VALUE"

# Без второго шага доступа нет.
GET {{base_url}}/me
HTTP 401
