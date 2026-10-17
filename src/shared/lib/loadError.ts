import { isApiError } from '../../api/ApiError';

/** Пояснение к ошибке загрузки человеческим языком — без кодов и технических деталей. */
export function describeLoadError(error: unknown): string {
  if (!isApiError(error)) {
    return 'Попробуйте ещё раз';
  }
  switch (error.kind) {
    case 'network':
      return 'Проверьте соединение';
    case 'timeout':
      return 'Сервер отвечает слишком долго. Попробуйте ещё раз';
    case 'http':
      return error.status === 404 ? 'Данные не найдены' : 'Сервис временно недоступен';
    case 'parse':
      return 'Сервер прислал данные в неожиданном формате. Мы уже знаем о проблеме';
    case 'aborted':
      return 'Загрузка прервана. Попробуйте ещё раз';
  }
}
