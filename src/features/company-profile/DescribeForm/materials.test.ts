import { describe, expect, it } from 'vitest';

import { fileProblem, formatFileSize, linkProblem, normalizeLink } from './materials';

const NBSP = ' ';

function fileOf(name: string, size: number): File {
  const file = new File(['x'], name);
  Object.defineProperty(file, 'size', { value: size });
  return file;
}

describe('fileProblem', () => {
  it('принимает PDF, DOCX и TXT до 10 МБ независимо от регистра расширения', () => {
    expect(fileProblem(fileOf('Отчёт.PDF', 1024))).toBeNull();
    expect(fileProblem(fileOf('Договор.docx', 10 * 1024 * 1024))).toBeNull();
    expect(fileProblem(fileOf('notes.txt', 10))).toBeNull();
  });

  it('объясняет, что не так с файлом', () => {
    expect(fileProblem(fileOf('Схема.png', 100))).toBe('Поддерживаются только PDF, DOCX и TXT');
    expect(fileProblem(fileOf('без-расширения', 100))).toBe(
      'Поддерживаются только PDF, DOCX и TXT',
    );
    expect(fileProblem(fileOf('Пусто.txt', 0))).toBe('Файл пустой');
    expect(fileProblem(fileOf('Большой.pdf', 10 * 1024 * 1024 + 1))).toBe(
      `Файл больше 10${NBSP}МБ`,
    );
  });
});

describe('formatFileSize', () => {
  it('показывает КБ и МБ по-русски', () => {
    expect(formatFileSize(300)).toBe(`1${NBSP}КБ`);
    expect(formatFileSize(820 * 1024)).toBe(`820${NBSP}КБ`);
    expect(formatFileSize(2.4 * 1024 * 1024)).toBe(`2,4${NBSP}МБ`);
  });
});

describe('ссылки', () => {
  it('дописывает протокол, если его нет', () => {
    expect(normalizeLink('  company.ru/about ')).toBe('https://company.ru/about');
    expect(normalizeLink('http://company.ru')).toBe('http://company.ru');
  });

  it('отклоняет кривые адреса и повторы', () => {
    expect(linkProblem('https://company.ru/about', [])).toBeNull();
    expect(linkProblem(normalizeLink('просто текст'), [])).toMatch(/Проверьте адрес/);
    expect(linkProblem('ftp://company.ru', [])).toMatch(/Проверьте адрес/);
    expect(linkProblem('https://company.ru', ['https://company.ru'])).toBe(
      'Эта ссылка уже добавлена',
    );
  });
});
