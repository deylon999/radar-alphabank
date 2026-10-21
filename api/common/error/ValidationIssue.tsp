namespace AlfaHackathonApi.Errors;

@doc("Отдельное нарушение правила валидации.")
model ValidationIssue {
    @doc("Название поля, в котором возникла ошибка валидации.")
    field: string;

    @doc("Короткое enum-обозначение ошибки.")
    title: string;

    @doc("Описание нарушения без значения пароля, секрета или одноразового кода.")
    description: string;
}
