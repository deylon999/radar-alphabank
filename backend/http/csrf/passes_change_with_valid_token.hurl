# Сценарий использования: защита от CSRF для изменяющих запросов (положительный случай).
# Проверяет: с токеном своей сессии изменяющий запрос проходит проверку CSRF.
# Вход не выполнен, поэтому дальше запрос останавливает проверка входа: 401, а не 403.

# Получаем анонимную сессию и запоминаем её CSRF-токен.
GET {{base_url}}/auth/csrf
HTTP 200
[Captures]
csrf_token: jsonpath "$.token"

# Выход с верным токеном без входа: CSRF пройден, ответ 401 /problems/authentication-required.
POST {{base_url}}/auth/logout
X-CSRF-TOKEN: {{csrf_token}}
HTTP 401
[Asserts]
header "Content-Type" contains "application/problem+json"
jsonpath "$.type" == "/problems/authentication-required"
jsonpath "$.status" == 401
