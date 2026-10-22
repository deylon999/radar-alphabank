namespace AlfaHackathonApi.Facts;

const describeCompanyRequestExample: DescribeCompanyRequest = #{
    text: "Строим дороги и мосты в Иркутской области. Спецтехнику закупаем в Китае.",
    links: #["https://example.com/about"]
};

@doc("Описание компании своими словами и ссылки на страницы о ней. Нужно непустое описание или хотя бы одна ссылка.")
@example(describeCompanyRequestExample)
model DescribeCompanyRequest {
    @doc("Описание компании. Пробелы по краям отбрасываются; пустое описание допустимо, если есть ссылки.")
    @maxLength(5000)
    text?: string;

    @doc("Ссылки на страницы о компании, только https. Пустой массив допустим, если есть описание.")
    @maxItems(5)
    links?: url[];
}
