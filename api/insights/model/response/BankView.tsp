namespace AlfaHackathonApi.Insights;

const policyRateMaterialExample: BankMaterial = #{
    id: "macro-policy-rate-2026-09-11",
    title: "Ключевая ставка ЦБ РФ: ставка без изменения на 14,0%, риторика стала жестче",
    publishedAt: utcDateTime.fromISO("2026-09-11T00:00:00Z"),
    outdated: false
};

const bankViewExample: BankView = #{
    summary: "Ждём сохранения ставки 14,0% до конца 2026 года; к концу 2027 — 12%",
    material: #{ ...policyRateMaterialExample, page: 1 },
    supersedes: #{
        summary: "Ждём ставку 13,5% на конец 2026 года",
        material: #{
            id: "macro-stat-1h26",
            title: "Макростатистика 1П26: слабый рост 1П26 смещает прогноз роста ВВП на 0,1% за год",
            publishedAt: utcDateTime.fromISO("2026-07-31T00:00:00Z"),
            outdated: false,
            page: 1
        }
    }
};

@doc("Аналитический материал Альфа-Банка.")
@example(policyRateMaterialExample)
model BankMaterial {
    @doc("ID материала в базе аналитики банка.")
    @minLength(1)
    id: string;

    @doc("Название материала.")
    @minLength(1)
    title: string;

    @doc("Дата публикации.")
    publishedAt: utcDateTime;

    @doc("Устарел ли материал для текущей ситуации. Если true, интерфейс предупреждает, что на оценку нельзя опираться.")
    outdated: boolean;
}

@doc("Материал банка с местом, откуда взята оценка.")
model BankMaterialCitation {
    ...BankMaterial;

    @doc("Номер страницы. Не передаётся, если у материала нет страниц.")
    @minValue(1)
    page?: int32;
}

@doc("Прежняя оценка банка, которую пересмотрел более свежий материал.")
model SupersededBankView {
    @doc("Прежняя оценка.")
    @minLength(1)
    summary: string;

    @doc("Материал прежней оценки.")
    material: BankMaterialCitation;
}

@doc("""
    Позиция Альфа-Банка: выжимка из его аналитики, а не вывод модели.
    summary содержит только то, что есть в материале. Без материала позиция не формируется.
    """)
@example(bankViewExample)
model BankView {
    @doc("Оценка банка из материала.")
    @minLength(1)
    summary: string;

    @doc("Материал, из которого взята оценка.")
    material: BankMaterialCitation;

    @doc("Прежняя оценка, если банк её пересмотрел. Интерфейс показывает «было → стало». Не передаётся, если пересмотра не было.")
    supersedes?: SupersededBankView;
}
