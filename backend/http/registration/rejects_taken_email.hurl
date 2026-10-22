# Сценарий использования: регистрация на уже занятый email.
# Проверяет: повторная регистрация того же email отвечает 409 /problems/email-already-exists.

# Получаем анонимную сессию и CSRF-токен.
GET {{base_url}}/auth/csrf
[Options]
variable: email=hurl-{{newUuid}}@example.com
HTTP 200
[Captures]
csrf_token: jsonpath "$.token"

# Первая регистрация проходит.
POST {{base_url}}/auth/register
X-CSRF-TOKEN: {{csrf_token}}
{
    "email": "{{email}}",
    "password": "My company has useful news"
}
HTTP 201

# Вторая регистрация с тем же email отклоняется.
POST {{base_url}}/auth/register
X-CSRF-TOKEN: {{csrf_token}}
{
    "email": "{{email}}",
    "password": "Another long company passphrase"
}
HTTP 409
[Asserts]
header "Content-Type" contains "application/problem+json"
jsonpath "$.type" == "/problems/email-already-exists"
