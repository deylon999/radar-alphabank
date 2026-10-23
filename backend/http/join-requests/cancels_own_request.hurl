# Сценарий использования: отмена своей заявки.
# Проверяет: заявитель отменяет ожидающую заявку, после чего может создать свою компанию.

# Задаём уникальные email участников сценария.
GET {{base_url}}/auth/csrf
[Options]
variable: owner_email=hurl-{{newUuid}}@example.com
variable: applicant_email=hurl-{{newUuid}}@example.com
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

# Получаем сессию и CSRF-токен для пользователя «заявитель».
GET {{base_url}}/auth/csrf
HTTP 200
[Captures]
csrf_token: jsonpath "$.token"

# Регистрируем пользователя «заявитель».
POST {{base_url}}/auth/register
X-CSRF-TOKEN: {{csrf_token}}
{
    "email": "{{applicant_email}}",
    "password": "My company has useful news"
}
HTTP 201

# Входим как «заявитель».
POST {{base_url}}/auth/login
X-CSRF-TOKEN: {{csrf_token}}
{
    "email": "{{applicant_email}}",
    "password": "My company has useful news"
}
HTTP 200

# После входа получаем новый CSRF-токен.
GET {{base_url}}/auth/csrf
HTTP 200
[Captures]
csrf_token: jsonpath "$.token"

# Заявитель подаёт заявку.
POST {{base_url}}/companies/{{company_id}}/join-requests
X-CSRF-TOKEN: {{csrf_token}}
{}
HTTP 201
[Captures]
request_id: jsonpath "$.id"

# Пока заявка ждёт решения, создать свою компанию нельзя.
POST {{base_url}}/companies
X-CSRF-TOKEN: {{csrf_token}}
{
    "name": "ООО «Своя»",
    "inn": "7707083893"
}
HTTP 409
[Asserts]
jsonpath "$.type" == "/problems/join-request-pending"

# Отменяем заявку.
POST {{base_url}}/companies/{{company_id}}/join-requests/{{request_id}}/cancel
X-CSRF-TOKEN: {{csrf_token}}
HTTP 200
[Asserts]
jsonpath "$.status" == "cancelled"

# Теперь можно создать свою компанию.
POST {{base_url}}/companies
X-CSRF-TOKEN: {{csrf_token}}
{
    "name": "ООО «Своя»",
    "inn": "7707083893"
}
HTTP 201
