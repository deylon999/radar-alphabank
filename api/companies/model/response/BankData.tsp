namespace AlfaHackathonApi.Companies;

const bankDataExample: BankData = #{
    okved: #{
        code: "42.99",
        name: "Строительство прочих инженерных сооружений, не включённых в другие группировки"
    },
    region: "Иркутская область",
    city: "Иркутск",
    revenue: 62340483339,
    employees: "Более 251",
    ageYears: "16-25",
    stage: "Бизнес в новой реальности",
    ownership: "Частная собственность",
    relationship: "client",
    products: #["settlement", "loan", "leasing", "guarantee", "payroll"],
    foreignTrade: #{ countries: #["Китай"] },
    group: #{ id: "group_133188_sb", companies: 22 },
    counterparties: #[
        #{ id: "U_9972", direction: "outgoing", amount: 799650000, payments: 32 },
        #{
            id: "U_130843",
            direction: "incoming",
            amount: 512000000,
            payments: 18,
            industry: "Строительство автомобильных дорог и автомагистралей"
        }
    ]
};

@doc("Продукт банка у компании. Соответствует флагам CL_PRODUCT_*_MARK и FACTORING_MARK датасета.")
union BankProduct {
    "settlement",
    "loan",
    "leasing",
    "guarantee",
    "deposit",
    "payroll",
    "factoring",
}

@doc("Основной вид деятельности по ОКВЭД.")
model Okved {
    @doc("Код ОКВЭД, MAINOKVED_CODE.")
    @minLength(1)
    code: string;

    @doc("Наименование ОКВЭД, MAINOKVED_NAME.")
    @minLength(1)
    name: string;
}

@doc("Внешнеторговая деятельность по данным ФТС.")
model ForeignTrade {
    @doc("Страны из FTS_COUNTRY_NAME.")
    @minItems(1)
    countries: string[];
}

@doc("Группа компаний из датасета.")
model CompanyGroup {
    @doc("GROUP_ID.")
    @minLength(1)
    id: string;

    @doc("Число компаний группы в датасете.")
    @minValue(1)
    companies: int32;
}

@doc("""
    Контрагент по платежам из датасета. id — идентификатор SYNTHETIC_U внутри датасета, а не ссылка на компанию в API:
    доступа к профилю контрагента он не даёт.
    """)
model Counterparty {
    @doc("SYNTHETIC_U контрагента.")
    @minLength(1)
    id: string;

    @doc("incoming — контрагент платит компании (компания — BENEFICIARY), outgoing — компания платит ему (PAYER).")
    direction: "incoming" | "outgoing";

    @doc("Сумма платежей PAY_AMT в целых рублях.")
    @minValue(0)
    amount: int64;

    @doc("Число платежей PAY_CNT.")
    @minValue(0)
    payments: int32;

    @doc("Наименование ОКВЭД контрагента. Не передаётся, если контрагента нет в датасете компаний.")
    industry?: string;
}

@doc("""
    Признаки компании из обезличенного датасета банка. Только для чтения, пользователи их не меняют.
    Строковые градации передаются как в данных, например «Более 251».
    """)
@example(bankDataExample)
model BankData {
    @doc("Основной вид деятельности.")
    okved: Okved;

    @doc("Регион регистрации, REGION.")
    @minLength(1)
    region: string;

    @doc("Город регистрации, CITY. Не передаётся, если его нет в данных.")
    city?: string;

    @doc("Годовая выручка REVENUE_COMPANY в целых рублях.")
    @minValue(0)
    revenue: int64;

    @doc("Численность работников по данным ФНС, AMOUNT_WORKERS_FNS_GRADATION. Не передаётся, если её нет.")
    employees?: string;

    @doc("Возраст компании, COMPANY_AGE_YEARS_GRADATION. Не передаётся, если его нет.")
    ageYears?: string;

    @doc("Стадия развития бизнеса, ECO_MARK_LABEL. Не передаётся, если её нет.")
    stage?: string;

    @doc("Форма собственности, OKFS_NAME. Не передаётся, если её нет.")
    ownership?: string;

    @doc("Отношения с банком по CL_TYPE: client — действующий клиент, prospect — потенциальный, closed — бывший.")
    relationship: "client" | "prospect" | "closed";

    @doc("Продукты банка у компании. Пустой массив, если продуктов нет.")
    products: BankProduct[];

    @doc("Внешнеторговая деятельность. Не передаётся, если по данным ФТС её нет.")
    foreignTrade?: ForeignTrade;

    @doc("Группа компаний. Не передаётся, если компания не входит в группу.")
    group?: CompanyGroup;

    @doc("До 5 крупнейших контрагентов по сумме платежей, без переводов самой себе. Пустой массив, если платежей нет.")
    @maxItems(5)
    counterparties: Counterparty[];
}
