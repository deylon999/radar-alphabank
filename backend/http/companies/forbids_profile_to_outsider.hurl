# Сценарий использования: изоляция данных компании.
# Проверяет: пользователь, не состоящий в компании, получает 403 company-membership-required,
# а несуществующая компания даёт 404 company-not-found.

# Задаём уникальные email участников сценария.
GET {{base_url}}/auth/csrf
[Options]
variable: owner_email=hurl-{{newUuid}}@example.com
variable: outsider_email=hurl-{{newUuid}}@example.com
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

# Выходим: cookie сессии удаляется, следующий пользователь входит заново.
POST {{base_url}}/auth/logout
X-CSRF-TOKEN: {{csrf_token}}
HTTP 204

# Получаем сессию и CSRF-токен для пользователя «посторонний».
GET {{base_url}}/auth/csrf
HTTP 200
[Captures]
csrf_token: jsonpath "$.token"

# Регистрируем пользователя «посторонний».
POST {{base_url}}/auth/register
X-CSRF-TOKEN: {{csrf_token}}
{
    "email": "{{outsider_email}}",
    "password": "My company has useful news"
}
HTTP 201

# Входим как «посторонний».
POST {{base_url}}/auth/login
X-CSRF-TOKEN: {{csrf_token}}
{
    "email": "{{outsider_email}}",
    "password": "My company has useful news"
}
HTTP 200

# После входа получаем новый CSRF-токен.
GET {{base_url}}/auth/csrf
HTTP 200
[Captures]
csrf_token: jsonpath "$.token"

# Посторонний не видит профиль чужой компании.
GET {{base_url}}/companies/{{company_id}}
HTTP 403
[Asserts]
header "Content-Type" contains "application/problem+json"
jsonpath "$.type" == "/problems/company-membership-required"

# Несуществующая компания.
GET {{base_url}}/companies/U_0
HTTP 404
[Asserts]
jsonpath "$.type" == "/problems/company-not-found"
