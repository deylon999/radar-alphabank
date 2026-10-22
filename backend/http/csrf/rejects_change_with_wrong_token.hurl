# Сценарий использования: защита от CSRF для изменяющих запросов.
# Проверяет: токен, не выданный этой сессии, не принимается:
# 403 /problems/invalid-csrf-token.

# Получаем анонимную сессию; её настоящий токен намеренно не используем.
GET {{base_url}}/auth/csrf
HTTP 200

# Выход с выдуманным токеном: запрос не проходит проверку CSRF.
POST {{base_url}}/auth/logout
X-CSRF-TOKEN: 00000000-0000-0000-0000-000000000000
HTTP 403
[Asserts]
header "Content-Type" contains "application/problem+json"
jsonpath "$.type" == "/problems/invalid-csrf-token"
jsonpath "$.status" == 403
