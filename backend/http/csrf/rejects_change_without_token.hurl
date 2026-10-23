# Сценарий использования: защита от CSRF для изменяющих запросов.
# Проверяет: изменяющий запрос в существующей сессии без заголовка X-CSRF-TOKEN
# отклоняется с 403 /problems/invalid-csrf-token ещё до проверки входа.

# Получаем анонимную сессию, чтобы отказ был именно из-за отсутствия токена.
GET {{base_url}}/auth/csrf
HTTP 200

# Выход без X-CSRF-TOKEN: запрос не проходит проверку CSRF.
POST {{base_url}}/auth/logout
HTTP 403
[Asserts]
header "Content-Type" contains "application/problem+json"
jsonpath "$.type" == "/problems/invalid-csrf-token"
jsonpath "$.status" == 403
