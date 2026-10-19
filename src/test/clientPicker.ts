import { screen, within } from '@testing-library/react';
import type { UserEvent } from '@testing-library/user-event';

/** Кнопка выбора клиента в шапке: «Компания: Клиент U_9250». */
export const companyButton = () => screen.findByRole('button', { name: /^Компания: / });

/** Открывает выбор клиента и выбирает клиента по названию. */
export async function chooseClient(user: UserEvent, name: string) {
  await user.click(await companyButton());
  const dialog = await screen.findByRole('dialog', { name: 'Выбор клиента' });
  await user.click(
    await within(dialog).findByRole('button', { name: new RegExp(`^${name}(?!\\d)`) }),
  );
}
