# Сценарий использования: исключение участника владельцем.
# Проверяет: владелец исключает участника (204), участник теряет доступ к компании
# со следующего запроса, а владелец сам выйти не может (409).

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

# Выходим: cookie сессии удаляется, следующий пользователь входит заново.
POST {{base_url}}/auth/logout
X-CSRF-TOKEN: {{csrf_token}}
HTTP 204

# Входим снова как «владелец».
GET {{base_url}}/auth/csrf
HTTP 200
[Captures]
csrf_token: jsonpath "$.token"

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

# В списке два участника, первым идёт владелец.
GET {{base_url}}/companies/{{company_id}}/members
HTTP 200
[Captures]
owner_id: jsonpath "$.members[0].userId"
[Asserts]
jsonpath "$.members" count == 2
jsonpath "$.members[0].role" == "owner"

# Владелец не может выйти из компании.
DELETE {{base_url}}/companies/{{company_id}}/members/{{owner_id}}
X-CSRF-TOKEN: {{csrf_token}}
HTTP 409
[Asserts]
jsonpath "$.type" == "/problems/owner-cannot-leave"

# Владелец исключает участника.
DELETE {{base_url}}/companies/{{company_id}}/members/{{member_id}}
X-CSRF-TOKEN: {{csrf_token}}
HTTP 204

# Выходим: cookie сессии удаляется, следующий пользователь входит заново.
POST {{base_url}}/auth/logout
X-CSRF-TOKEN: {{csrf_token}}
HTTP 204

# Входим снова как «участник».
GET {{base_url}}/auth/csrf
HTTP 200
[Captures]
csrf_token: jsonpath "$.token"

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

# Исключённый участник больше не видит профиль компании.
GET {{base_url}}/companies/{{company_id}}
HTTP 403
[Asserts]
jsonpath "$.type" == "/problems/company-membership-required"
