import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, test } from './fixtures';

const NEW_FACT = 'Новая база техники в Братске откроется весной';

const pendingBanner = (page: Page) =>
  page.getByRole('heading', { level: 2, name: /ждут? подтверждения/ });

test('описал компанию → появились факты → подтвердил', async ({ page }) => {
  await page.goto('/company');
  await expect(pendingBanner(page)).toHaveText('3 изменения ждут подтверждения');

  const form = page.getByRole('region', { name: 'Расскажите о компании' });
  await form.getByRole('textbox', { name: 'Описание' }).fill(`${NEW_FACT}.`);
  await form.getByRole('textbox', { name: 'Ссылки' }).fill('u9250.example.com');
  await form.getByRole('button', { name: 'Добавить' }).click();
  await form.getByRole('button', { name: 'Разобрать материалы' }).click();

  await expect(form.getByText('Разбираем материалы…')).toBeVisible();
  await expect(page.getByText('Добавлено: 2 факта. Проверьте и подтвердите')).toBeVisible();
  await expect(pendingBanner(page)).toHaveText('5 изменений ждут подтверждения');

  const fact = page.getByRole('listitem').filter({ hasText: NEW_FACT });
  await expect(fact.getByText('Ждёт подтверждения')).toBeVisible();
  await fact.getByRole('button', { name: 'Подтвердить' }).click();

  await expect(fact.getByText('Подтверждено')).toBeVisible();
  await expect(pendingBanner(page)).toHaveText('4 изменения ждут подтверждения');

  // Профиль переживает перезагрузку: моки хранят состояние вкладки.
  await page.reload();
  await expect(fact.getByText('Подтверждено')).toBeVisible();
});

test('правка факта на месте с клавиатуры', async ({ page }) => {
  await page.goto('/company');
  const fact = page
    .getByRole('listitem')
    .filter({ hasText: 'Технику на объекты доставляют по железной дороге до Тайшета' });

  await fact.getByRole('button', { name: 'Исправить' }).click();
  const field = page.getByRole('textbox', { name: 'Формулировка факта' });
  await expect(field).toBeFocused();
  // На время правки кнопки факта спрятаны — видны только «Сохранить» и «Отменить».
  await expect(fact.getByRole('button', { name: 'Отклонить' })).toBeHidden();
  await field.fill('Технику возят по железной дороге до Братска');
  await field.press('Enter');

  const edited = page
    .getByRole('listitem')
    .filter({ hasText: 'Технику возят по железной дороге до Братска' });
  await expect(edited.getByText('Подтверждено')).toBeVisible();
  await expect(edited.getByRole('button', { name: 'Исправить' })).toBeFocused();
});

test('профиль с выбранными файлами и ошибкой: нет нарушений axe и прокрутки вбок', async ({
  page,
}) => {
  await page.goto('/company');
  await page.getByRole('button', { name: 'Разобрать материалы' }).click();
  await expect(page.getByText('Опишите компанию, добавьте ссылку или документ')).toBeVisible();

  await page.locator('input[type="file"]').setInputFiles([
    {
      name: 'Договор поставки с очень длинным названием для проверки обрезки.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.4'),
    },
    { name: 'Пустой.txt', mimeType: 'text/plain', buffer: Buffer.alloc(0) },
  ]);
  const files = page.getByRole('list', { name: 'Выбранные файлы' });
  await expect(files.getByRole('listitem')).toHaveCount(2);
  await expect(files).toContainText('Файл пустой');

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);

  const { violations } = await new AxeBuilder({ page }).analyze();
  const severe = violations
    .filter((violation) => violation.impact === 'serious' || violation.impact === 'critical')
    .map((violation) => `${violation.id}: ${violation.help}`);
  expect(severe).toEqual([]);
});
