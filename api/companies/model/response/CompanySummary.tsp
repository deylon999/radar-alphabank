import "../../../common/model/CompanyId.tsp";

using AlfaHackathonApi.Domain;

namespace AlfaHackathonApi.Companies;

const datasetCompanySummaryExample: CompanySummary = #{
    id: "U_9250",
    name: "Клиент U_9250",
    origin: "dataset"
};

const userCompanySummaryExample: CompanySummary = #{
    id: "3f6b8c2e-5d41-4a7e-9c0b-2e8f1a6d4b93",
    name: "ООО «Тестовая логистика»",
    inn: "0012345673",
    origin: "user"
};

@doc("Публичная карточка компании для поиска и ссылок. Не содержит профиль, признаки и аналитику.")
@example(datasetCompanySummaryExample)
@example(userCompanySummaryExample)
model CompanySummary {
    @doc("ID компании.")
    id: CompanyId;

    @doc("Название. У компаний из данных банка обезличено, у созданных пользователями указано создателем и не проверено.")
    name: string;

    @doc("ИНН, указанный создателем компании. Не проверен по реестру. Не передаётся, если ИНН нет, как у компаний из данных банка.")
    @pattern("^([0-9]{10}|[0-9]{12})$")
    inn?: string;

    @doc("Происхождение компании: dataset — загружена из данных банка, user — создана пользователем.")
    origin: "dataset" | "user";
}
