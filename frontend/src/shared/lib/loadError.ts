import { isApiError } from '../../api/ApiError';
import { mockStatus } from '../../api/config';

/** Пояснение к ошибке загрузки человеческим языком — без кодов и технических деталей. */
export function describeLoadError(error: unknown): string {
  if (!isApiError(error)) {
    return 'Попробуйте ещё раз';
  }
  if (mockStatus.failed) {
    return 'Демо-данные не запустились в этом браузере. Откройте сайт в Chrome или Safari, а не во встроенном браузере приложения';
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
