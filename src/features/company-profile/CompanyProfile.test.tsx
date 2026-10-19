import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { COMPANY_IDS } from '../../mocks/fixtures';
import type { ProfileFact } from '../../schemas/company';
import { USER_ROLE_STORAGE_KEY } from '../../shared/lib/userRole';
import { createMockServer } from '../../test/mockServer';
import { renderApp } from '../../test/renderApp';

const { server, store } = createMockServer();

beforeAll(() => {
  server.listen({ onUnhandledFrame: 'error' });
});
beforeEach(() => {
  window.localStorage.clear();
});
afterEach(() => {
  store.reset();
  server.resetHandlers();
});
afterAll(() => {
  server.close();
});

const PORT_FACT = 'Технику на объекты доставляют по железной дороге до Тайшета';
const LEASING_FACT = 'Спецтехника в лизинге с фиксированными платежами в рублях';

function storedFact(statementStart: string) {
  return store
    .read()
    .companies.find((company) => company.id === COMPANY_IDS.construction)
    ?.facts.find((fact) => fact.statement.startsWith(statementStart));
}

async function openProfile() {
  const app = renderApp('/company');
  await screen.findByRole('region', { name: 'Факты о компании' });
  return app;
}

/** Строка факта по началу формулировки. */
function factRow(statementStart: string): HTMLElement {
  const row = screen.getByText((text) => text.startsWith(statementStart)).closest('li');
  if (!row) {
    throw new Error(`Нет факта «${statementStart}»`);
  }
  return row;
}

function banner() {
  return screen.getByRole('heading', { level: 2, name: /ждут? подтверждения/ });
}

describe('профиль компании', () => {
  it('показывает шапку, плашку ожидающих изменений и факты по категориям', async () => {
    await openProfile();

    expect(screen.getByRole('heading', { name: 'Клиент U_9250' })).toBeInTheDocument();
    expect(screen.getByText('Строительство инженерных сооружений')).toBeInTheDocument();
    expect(banner()).toHaveTextContent('3 изменения ждут подтверждения');
    expect(screen.getByText('Чем точнее профиль, тем точнее лента.')).toBeInTheDocument();

    const categories = within(screen.getByRole('region', { name: 'Факты о компании' }))
      .getAllByRole('heading', { level: 3 })
      .map((h) => h.textContent);
    expect(categories).toEqual([
      'Поставщики 1',
      'Клиенты 1',
      'Логистика 2',
      'Финансы 2',
      'Другое 1',
    ]);
    const logistics = screen.getByRole('region', { name: 'Логистика 2' });
    expect(within(logistics).getAllByRole('listitem')[1]).toHaveTextContent('Ждёт подтверждения');
    expect(within(factRow(PORT_FACT)).getByText(/Ссылка · example\.com/)).toBeInTheDocument();
  });

  it('показывает данные банка: признаки, продукты, ВЭД и контрагентов', async () => {
    await openProfile();
    const bank = screen.getByRole('region', { name: 'Данные банка о компании' });

    expect(bank).toHaveTextContent('ОКВЭД 42.99');
    expect(bank).toHaveTextContent('Иркутск, Иркутская область');
    expect(bank).toHaveTextContent('Выручка за год62,3 млрд ₽');
    expect(bank).toHaveTextContent('Внешняя торговляКитай');
    expect(bank).toHaveTextContent('Группа компаний22 компании');
    expect(
      within(within(bank).getByRole('list', { name: 'Продукты банка' }))
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual(['Расчётный счёт', 'Кредиты', 'Лизинг', 'Банковские гарантии', 'Зарплатный проект']);
    expect(within(bank).getByRole('heading', { name: 'Крупные контрагенты' })).toBeVisible();
    expect(bank).toHaveTextContent(
      'U_4909 · Производство электроэнергииПлатит вам · 6,5 млрд ₽ · 28 платежей',
    );
  });

  it('роль пользователя выбирается в профиле и запоминается', async () => {
    const { user } = await openProfile();
    const role = screen.getByRole('combobox', { name: 'Роль в компании' });
    expect(role).toHaveValue('ceo');

    await user.selectOptions(role, 'Финансовый директор');

    expect(window.localStorage.getItem(USER_ROLE_STORAGE_KEY)).toBe('cfo');
  });

  it('«Подтвердить» меняет статус факта и число в плашке', async () => {
    const { user } = await openProfile();

    await user.click(within(factRow(PORT_FACT)).getByRole('button', { name: 'Подтвердить' }));

    await waitFor(() => {
      expect(within(factRow(PORT_FACT)).getByText('Подтверждено')).toBeInTheDocument();
    });
    expect(banner()).toHaveTextContent('2 изменения ждут подтверждения');
    expect(storedFact(PORT_FACT)?.status).toBe('confirmed');
    expect(within(factRow(PORT_FACT)).queryByRole('button', { name: 'Подтвердить' })).toBeNull();
  });

  it('«Отклонить» можно отменить из уведомления', async () => {
    const { user } = await openProfile();

    await user.click(within(factRow(LEASING_FACT)).getByRole('button', { name: 'Отклонить' }));

    expect(await screen.findByRole('button', { name: 'Отменить' })).toBeInTheDocument();
    expect(within(factRow(LEASING_FACT)).getByText('Отклонено')).toBeInTheDocument();
    expect(storedFact(LEASING_FACT)?.status).toBe('rejected');
    expect(banner()).toHaveTextContent('2 изменения ждут подтверждения');

    await user.click(screen.getByRole('button', { name: 'Отменить' }));

    await waitFor(() => {
      expect(storedFact(LEASING_FACT)?.status).toBe('pending');
    });
    await waitFor(() => {
      expect(banner()).toHaveTextContent('3 изменения ждут подтверждения');
    });
  });

  it('«Исправить» правит формулировку на месте и подтверждает факт', async () => {
    const { user } = await openProfile();

    await user.click(within(factRow(PORT_FACT)).getByRole('button', { name: 'Исправить' }));
    const field = screen.getByRole('textbox', { name: 'Формулировка факта' });
    expect(field).toHaveFocus();

    await user.clear(field);
    await user.keyboard('{Enter}');
    expect(screen.getByRole('alert')).toHaveTextContent('Формулировка не может быть пустой');

    await user.type(field, 'Технику возят по железной дороге до Братска{Enter}');

    expect(
      await screen.findByText('Технику возят по железной дороге до Братска'),
    ).toBeInTheDocument();
    expect(storedFact('Технику возят')).toMatchObject({ status: 'confirmed' });
    expect(storedFact(PORT_FACT)).toBeUndefined();
    expect(
      within(factRow('Технику возят')).getByRole('button', { name: 'Исправить' }),
    ).toHaveFocus();
  });

  it('Esc закрывает правку без сохранения', async () => {
    const { user } = await openProfile();

    await user.click(within(factRow(PORT_FACT)).getByRole('button', { name: 'Исправить' }));
    await user.type(screen.getByRole('textbox', { name: 'Формулировка факта' }), ' и Братска');
    await user.keyboard('{Escape}');

    expect(screen.queryByRole('textbox', { name: 'Формулировка факта' })).toBeNull();
    expect(factRow(PORT_FACT)).toHaveTextContent(PORT_FACT);
    expect(storedFact(PORT_FACT)?.statement).toBe(PORT_FACT);
  });

  it('«Подтвердить все» подтверждает все ожидающие факты', async () => {
    const { user } = await openProfile();

    await user.click(screen.getByRole('button', { name: 'Подтвердить все' }));

    expect(await screen.findByText(/Все факты проверены/)).toBeInTheDocument();
    const facts =
      store.read().companies.find((c) => c.id === COMPANY_IDS.construction)?.facts ?? [];
    expect(facts.filter((fact) => fact.status === 'pending')).toEqual([]);
    expect(screen.queryAllByText('Ждёт подтверждения')).toEqual([]);
  });

  it('не грузится — понятная ошибка и «Повторить»', async () => {
    // Падает только профиль: список компаний для шапки должен загрузиться.
    server.use(
      http.get('*/api/companies/:companyId', () => HttpResponse.json({}, { status: 500 }), {
        once: true,
      }),
    );
    const { user } = renderApp('/company');

    expect(await screen.findByText('Не удалось загрузить профиль компании')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Повторить' }));

    expect(await screen.findByRole('region', { name: 'Факты о компании' })).toBeInTheDocument();
  });
});

describe('«Расскажите о компании»', () => {
  it('пустой профиль: одна промо-плашка, кнопка ведёт в поле описания', async () => {
    store.write((db) => {
      const agro = db.companies.find((company) => company.id === COMPANY_IDS.construction);
      if (agro) agro.facts = [];
    });
    const { user } = await openProfile();

    expect(screen.getByRole('heading', { name: /^Начните с\sпрофиля$/ })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /ждут? подтверждения/ })).toBeNull();
    expect(screen.getByText(/Фактов пока нет/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Описать компанию' }));

    expect(screen.getByRole('textbox', { name: 'Описание' })).toHaveFocus();
  });

  it('описание и ссылка превращаются в факты, которые ждут подтверждения', async () => {
    const { user } = await openProfile();
    const form = screen.getByRole('region', { name: 'Расскажите о компании' });

    await user.type(
      within(form).getByRole('textbox', { name: 'Описание' }),
      'Новая база техники в Братске откроется весной.',
    );
    await user.type(within(form).getByRole('textbox', { name: 'Ссылки' }), 'u9250.example.com');
    await user.click(within(form).getByRole('button', { name: 'Добавить' }));
    expect(within(form).getByRole('list', { name: 'Добавленные ссылки' })).toHaveTextContent(
      'https://u9250.example.com',
    );

    await user.click(within(form).getByRole('button', { name: 'Разобрать материалы' }));

    expect(await screen.findByText('Добавлено: 2 факта. Проверьте и подтвердите')).toBeVisible();
    expect(banner()).toHaveTextContent('5 изменений ждут подтверждения');
    expect(within(factRow('Новая база техники')).getByText('Ждёт подтверждения')).toBeVisible();
    expect(
      within(factRow('Подрядчик по ремонту трёх мостов')).getByText(/u9250\.example\.com/),
    ).toBeVisible();
    // Принятое сервером убрано из формы — повторная отправка не задвоит факты.
    expect(within(form).getByRole('textbox', { name: 'Описание' })).toHaveValue('');
  });

  it('пустая форма не отправляется и подсказывает, что сделать', async () => {
    const { user } = await openProfile();

    await user.click(screen.getByRole('button', { name: 'Разобрать материалы' }));

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Опишите компанию, добавьте ссылку или документ',
    );
  });

  it('неверная ссылка — ошибка под полем', async () => {
    const { user } = await openProfile();
    const input = screen.getByRole('textbox', { name: 'Ссылки' });

    await user.type(input, 'не ссылка{Enter}');

    expect(screen.getByRole('alert')).toHaveTextContent('Проверьте адрес');
    expect(input).toHaveAttribute('aria-invalid', 'true');
  });

  it('файлы перетаскиванием: неподходящий остаётся с причиной, подходящий уходит на разбор', async () => {
    // FormData из jsdom не понимает fetch в Node, поэтому разбор multipart здесь подменён:
    // сам обработчик документов проверен в mocks/handlers.test.ts в окружении node.
    let uploads = 0;
    server.use(
      http.post('*/api/companies/:companyId/documents', () => {
        uploads += 1;
        const fact: ProfileFact = {
          id: 'doc-fact',
          category: 'site',
          statement: 'Склад в Приреченске арендуется до 2028 года',
          status: 'pending',
          source: { kind: 'document', label: 'Договор аренды.pdf' },
        };
        store.write((db) => {
          db.companies.find((company) => company.id === COMPANY_IDS.construction)?.facts.push(fact);
        });
        return HttpResponse.json({ facts: [fact] });
      }),
    );
    const { user } = await openProfile();
    const picture = new File(['png'], 'Схема склада.png', { type: 'image/png' });
    const contract = new File(['%PDF'], 'Договор аренды.pdf', { type: 'application/pdf' });

    // При перетаскивании, в отличие от выбора в окне, accept файлы не фильтрует.
    fireEvent.drop(screen.getByText('Перетащите файлы сюда или'), {
      dataTransfer: { files: [picture, contract], clearData: () => undefined },
    });

    const files = screen.getByRole('list', { name: 'Выбранные файлы' });
    expect(within(files).getAllByRole('listitem')).toHaveLength(2);
    expect(files).toHaveTextContent('Поддерживаются только PDF, DOCX и TXT');

    await user.click(screen.getByRole('button', { name: 'Разобрать материалы' }));

    expect(await screen.findByText('Добавлено: 1 факт. Проверьте и подтвердите')).toBeVisible();
    expect(uploads).toBe(1);
    expect(factRow('Склад в Приреченске')).toHaveTextContent('Документ · Договор аренды.pdf');
    // Отправленный файл убран из списка, неподходящий остался с причиной.
    expect(screen.getByRole('list', { name: 'Выбранные файлы' })).toHaveTextContent(
      /^Схема склада\.pngПоддерживаются/,
    );
  });
});
