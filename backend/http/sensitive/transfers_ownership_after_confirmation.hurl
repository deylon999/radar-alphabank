# Сценарий использования: передача прав владельца.
# Проверяет: без подтверждения личности передача отклоняется (403), после подтверждения
# участник становится владельцем (204), а бывший владелец — участником.

# Задаём уникальные email участников сценария.
GET {{base_url}}/auth/csrf
[Options]
variable: owner_email=hurl-{{newUuid}}@example.com
variable: member_email=hurl-{{newUuid}}@example.com
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

# Создаём компанию.
POST {{base_url}}/companies
X-CSRF-TOKEN: {{csrf_token}}
{
    "name": "ООО «Тестовая логистика»",
    "inn": "7707083893"
}
HTTP 201
[Captures]
company_id: jsonpath "$.id"

# Выходим, чтобы следующий пользователь вошёл заново.
POST {{base_url}}/auth/logout
X-CSRF-TOKEN: {{csrf_token}}
HTTP 204

# Получаем сессию и CSRF-токен для пользователя «участник».
GET {{base_url}}/auth/csrf
HTTP 200
[Captures]
csrf_token: jsonpath "$.token"

# Регистрируем пользователя «участник».
POST {{base_url}}/auth/register
X-CSRF-TOKEN: {{csrf_token}}
{
    "email": "{{member_email}}",
    "password": "My company has useful news"
}
HTTP 201

# Входим как «участник».
POST {{base_url}}/auth/login
X-CSRF-TOKEN: {{csrf_token}}
{
    "email": "{{member_email}}",
    "password": "My company has useful news"
}
HTTP 200

# После входа получаем новый CSRF-токен.
GET {{base_url}}/auth/csrf
HTTP 200
[Captures]
csrf_token: jsonpath "$.token"

# Будущий участник подаёт заявку и запоминает свой ID.
POST {{base_url}}/companies/{{company_id}}/join-requests
X-CSRF-TOKEN: {{csrf_token}}
{}
HTTP 201
[Captures]
request_id: jsonpath "$.id"
member_id: jsonpath "$.applicant.id"

# Выходим, чтобы следующий пользователь вошёл заново.
POST {{base_url}}/auth/logout
X-CSRF-TOKEN: {{csrf_token}}
HTTP 204

# Получаем сессию и CSRF-токен для пользователя «владелец».
GET {{base_url}}/auth/csrf
HTTP 200
[Captures]
csrf_token: jsonpath "$.token"

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

# Владелец одобряет заявку.
POST {{base_url}}/companies/{{company_id}}/join-requests/{{request_id}}/approve
X-CSRF-TOKEN: {{csrf_token}}
HTTP 200

# Без подтверждения личности передать права нельзя.
POST {{base_url}}/companies/{{company_id}}/members/{{member_id}}/transfer-ownership
X-CSRF-TOKEN: {{csrf_token}}
HTTP 403
[Asserts]
jsonpath "$.type" == "/problems/reauthentication-required"

# Подтверждаем личность.
POST {{base_url}}/auth/reauthenticate
X-CSRF-TOKEN: {{csrf_token}}
{
    "password": "My company has useful news"
}
HTTP 200

# Передаём права участнику.
POST {{base_url}}/companies/{{company_id}}/members/{{member_id}}/transfer-ownership
X-CSRF-TOKEN: {{csrf_token}}
HTTP 204

# Бывший владелец теперь участник.
GET {{base_url}}/me
HTTP 200
[Asserts]
jsonpath "$.membership.role" == "member"

# Повторная передача бывшим владельцем запрещена.
POST {{base_url}}/companies/{{company_id}}/members/{{member_id}}/transfer-ownership
X-CSRF-TOKEN: {{csrf_token}}
HTTP 403
[Asserts]
jsonpath "$.type" == "/problems/company-owner-required"
