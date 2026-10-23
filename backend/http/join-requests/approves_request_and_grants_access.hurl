# Сценарий использования: вступление в компанию по заявке.
# Проверяет: пока заявка ждёт решения, доступа нет (403); после одобрения владельцем
# заявитель становится участником и получает доступ без повторного входа.

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
{
    "position": "cfo",
    "message": "Я финансовый директор"
}
HTTP 201
[Captures]
request_id: jsonpath "$.id"
[Asserts]
jsonpath "$.status" == "pending"

# Пока заявка ждёт решения, профиль компании недоступен.
GET {{base_url}}/companies/{{company_id}}
HTTP 403

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

# Владелец видит заявку и одобряет её.
GET {{base_url}}/companies/{{company_id}}/join-requests
HTTP 200
[Asserts]
jsonpath "$.joinRequests" count == 1
jsonpath "$.joinRequests[0].applicant.email" == "{{applicant_email}}"

POST {{base_url}}/companies/{{company_id}}/join-requests/{{request_id}}/approve
X-CSRF-TOKEN: {{csrf_token}}
HTTP 200
[Asserts]
jsonpath "$.status" == "approved"

# Выходим: cookie сессии удаляется, следующий пользователь входит заново.
POST {{base_url}}/auth/logout
X-CSRF-TOKEN: {{csrf_token}}
HTTP 204

# Входим снова как «заявитель».
GET {{base_url}}/auth/csrf
HTTP 200
[Captures]
csrf_token: jsonpath "$.token"

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

# Теперь заявитель — участник и видит профиль компании.
GET {{base_url}}/companies/{{company_id}}
HTTP 200

GET {{base_url}}/me
HTTP 200
[Asserts]
jsonpath "$.membership.role" == "member"
jsonpath "$.membership.position" == "cfo"
