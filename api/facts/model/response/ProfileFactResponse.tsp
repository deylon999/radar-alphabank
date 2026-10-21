import "../../../common/model/Uuid.tsp";

using AlfaHackathonApi.Domain;

namespace AlfaHackathonApi.Facts;

const textSourceExample: FactSource = #{ kind: "text", label: "Описание компании" };
const linkSourceExample: FactSource = #{ kind: "link", label: "example.com" };
const documentSourceExample: FactSource = #{ kind: "document", label: "Годовой отчёт 2025.pdf" };

const pendingFactExample: ProfileFactResponse = #{
    id: "8d2f6a1c-3b4e-4c5d-9e7f-1a2b3c4d5e6f",
    category: "supplier",
    statement: "Спецтехнику закупаем у производителей из Китая.",
    status: "pending",
    source: textSourceExample,
    createdAt: utcDateTime.fromISO("2026-10-18T13:00:00Z")
};

const confirmedFactExample: ProfileFactResponse = #{
    id: "4e7a9c2b-1d3f-4a5b-8c6d-7e8f9a0b1c2d",
    category: "site",
    statement: "Основная производственная база и склад техники — в Иркутске.",
    status: "confirmed",
    source: documentSourceExample,
    createdAt: utcDateTime.fromISO("2026-10-17T09:00:00Z"),
    updatedAt: utcDateTime.fromISO("2026-10-17T09:10:00Z"),
    updatedBy: #{ userId: "c3e1f7a2-4b6d-4e8f-a0c9-5d2b7e1f3a64", email: "maria@example.com" }
};

@doc("Категория сведения о компании.")
union FactCategory {
    "supplier",
    "customer",
    "site",
    "region",
    "product",
    "activity",
    "logistics",
    "finance",
    "other",
}

@doc("""
    Оценка факта пользователями компании. В аналитике используются только подтверждённые факты.
    pending — ещё не проверен; confirmed — подтверждён; rejected — отклонён и хранится,
    чтобы повторное извлечение не добавило его снова.
    """)
union FactStatus {
    "pending",
    "confirmed",
    "rejected",
}

@doc("Откуда взят факт.")
model FactSource {
    @doc("Вид источника: text — описание от пользователя, link — страница по ссылке, document — загруженный файл.")
    kind: "text" | "document" | "link";

    @doc("Подпись источника: «Описание компании», домен ссылки или имя файла.")
    @minLength(1)
    label: string;
}

@doc("Пользователь, последним изменивший факт. Он мог с тех пор выйти из компании.")
model FactEditor {
    @doc("ID пользователя.")
    userId: Uuid;

    @doc("Email пользователя.")
    @format("email")
    email: string;
}

@doc("Сведение о компании от её пользователей. Не является данными банка, даже если подтверждено.")
@example(pendingFactExample)
@example(confirmedFactExample)
model ProfileFactResponse {
    @doc("ID факта.")
    id: Uuid;

    @doc("Категория.")
    category: FactCategory;

    @doc("Формулировка факта.")
    @minLength(1)
    statement: string;

    @doc("Оценка пользователями компании.")
    status: FactStatus;

    @doc("Источник, из которого факт извлечён.")
    source: FactSource;

    @doc("Время извлечения.")
    createdAt: utcDateTime;

    @doc("Время последнего изменения статуса или формулировки. Не передаётся, если факт не меняли.")
    updatedAt?: utcDateTime;

    @doc("Кто последним изменил факт. Не передаётся, если факт не меняли.")
    updatedBy?: FactEditor;
}
