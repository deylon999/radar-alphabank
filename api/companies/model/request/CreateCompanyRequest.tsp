import "../../../common/model/Position.tsp";

using AlfaHackathonApi.Domain;

namespace AlfaHackathonApi.Companies;

const createCompanyRequestExample: CreateCompanyRequest = #{
    name: "ООО «Тестовая логистика»",
    inn: "0012345673",
    position: "ceo"
};

@doc("""
    Сведения для создания компании. Их должно хватать, чтобы при будущей модерации проверить,
    что компания существует. ID компании и роль создателя назначает сервер.
    """)
@example(createCompanyRequestExample)
model CreateCompanyRequest {
    @doc("Полное наименование организации или ИП, как в ЕГРЮЛ или ЕГРИП.")
    @minLength(1)
    @maxLength(500)
    name: string;

    @doc("""
        ИНН: 10 цифр у организации, 12 у ИП. Проверяется контрольная сумма, но не наличие в реестре.
        Не уникален: совпадение с ИНН другой компании не даёт к ней доступа и не мешает созданию.
        """)
    @pattern("^([0-9]{10}|[0-9]{12})$")
    inn: string;

    @doc("Должность создателя для персонализации. Не передаётся, если пользователь её не указал.")
    position?: Position;
}
