# Сценарий использования: создание компании пользователем без компании.
# Проверяет: компания создаётся (201), создатель — владелец, профиль компании доступен ему,
# у новой компании аналитика в состоянии needs_context.

# Задаём уникальные email участников сценария.
GET {{base_url}}/auth/csrf
[Options]
variable: owner_email=hurl-{{newUuid}}@example.com
HTTP 200

# Получаем сессию и CSRF-токен для пользователя «владелец».
GET {{base_url}}/auth/csrf
HTTP 200
[Captures]
csrf_token: jsonpath "$.token"

# Регистрируем пользователя «владелец».
POST {{base_url}}/auth/register
X-CSRF-TOKEN: {{csrf_token}}
{
    "email": "{{owner_email}}",
    "password": "My company has useful news"
}
HTTP 201

# Входим как «владелец».
POST {{base_url}}/auth/login
X-CSRF-TOKEN: {{csrf_token}}
{
    "email": "{{owner_email}}",
    "password": "My company has useful news"
}
HTTP 200

# После входа получаем новый CSRF-токен.
GET {{base_url}}/auth/csrf
HTTP 200
[Captures]
csrf_token: jsonpath "$.token"

# Создаём компанию: создатель становится владельцем.
POST {{base_url}}/companies
X-CSRF-TOKEN: {{csrf_token}}
{
    "name": "ООО «Тестовая логистика»",
    "inn": "7707083893",
    "position": "ceo"
}
HTTP 201
[Captures]
company_id: jsonpath "$.id"
[Asserts]
jsonpath "$.origin" == "user"

# В /me пользователь — владелец компании.
GET {{base_url}}/me
HTTP 200
[Asserts]
jsonpath "$.membership.company.id" == "{{company_id}}"
jsonpath "$.membership.role" == "owner"
jsonpath "$.membership.position" == "ceo"

# Владелец открывает профиль своей компании.
GET {{base_url}}/companies/{{company_id}}
HTTP 200
[Asserts]
jsonpath "$.analysis.status" == "needs_context"
jsonpath "$.facts" count == 0
