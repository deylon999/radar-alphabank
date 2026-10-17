import { DOCUMENT_RULES } from '../../../schemas/company';
import { NBSP } from '../../../shared/lib/typography';

const allowedExtensions: readonly string[] = DOCUMENT_RULES.extensions;
const MAX_SIZE_MB = DOCUMENT_RULES.maxSizeBytes / (1024 * 1024);

/** Для атрибута accept у поля выбора файлов: «.pdf,.docx,.txt». */
export const ACCEPTED_FILES = allowedExtensions.map((extension) => `.${extension}`).join(',');

export const FILE_RULES_HINT = `PDF, DOCX или TXT, до${NBSP}${String(MAX_SIZE_MB)}${NBSP}МБ`;

function extensionOf(fileName: string): string {
  const dot = fileName.lastIndexOf('.');
  return dot === -1 ? '' : fileName.slice(dot + 1).toLowerCase();
}

/** Причина, по которой файл не примем, или null — файл подходит. */
export function fileProblem(file: File): string | null {
  if (!allowedExtensions.includes(extensionOf(file.name))) {
    return 'Поддерживаются только PDF, DOCX и TXT';
  }
  if (file.size === 0) {
    return 'Файл пустой';
  }
  if (file.size > DOCUMENT_RULES.maxSizeBytes) {
    return `Файл больше ${String(MAX_SIZE_MB)}${NBSP}МБ`;
  }
  return null;
}

const sizeFormat = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 });

/** «820 КБ», «2,4 МБ». */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${sizeFormat.format(Math.max(1, Math.round(bytes / 1024)))}${NBSP}КБ`;
  }
  return `${sizeFormat.format(bytes / (1024 * 1024))}${NBSP}МБ`;
}

/** Ссылка, как её вводят руками: без протокола дописываем https://. */
export function normalizeLink(raw: string): string {
  const trimmed = raw.trim();
  return /^[a-z][a-z\d+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

/** Причина, по которой ссылку не примем, или null. Ссылка уже нормализована. */
export function linkProblem(link: string, added: readonly string[]): string | null {
  let url: URL;
  try {
    url = new URL(link);
  } catch {
    return 'Проверьте адрес: например, company.ru/about';
  }
  if ((url.protocol !== 'https:' && url.protocol !== 'http:') || !url.hostname.includes('.')) {
    return 'Проверьте адрес: например, company.ru/about';
  }
  if (added.includes(link)) {
    return 'Эта ссылка уже добавлена';
  }
  return null;
}
