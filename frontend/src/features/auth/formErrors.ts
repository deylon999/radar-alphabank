import { isApiError } from '../../api/ApiError';

export interface FormErrors {
  /** Общая ошибка формы — текст сервера как есть. */
  form?: string;
  fields: Record<string, string>;
}

/** Ошибки полей (422) — под полями, остальное — над кнопкой. */
export function readFormErrors(error: unknown): FormErrors {
  if (!isApiError(error)) {
    return { form: 'Не удалось отправить. Попробуйте ещё раз', fields: {} };
  }
  if (error.kind !== 'http') {
    return { form: 'Нет связи с сервером. Проверьте соединение и попробуйте ещё раз', fields: {} };
  }
  const fields = Object.fromEntries(error.issues.map((issue) => [issue.field, issue.description]));
  return { form: error.issues.length > 0 ? undefined : error.message, fields };
}
