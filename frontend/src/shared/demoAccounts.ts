/**
 * Демо-аккаунты владельцев компаний из датасета — для жюри и проверки без регистрации.
 * На настоящем бэкенде такие же аккаунты заводит бэкенд; список — в README.
 */
export const DEMO_PASSWORD = 'radar-demo-2026!';

export const DEMO_ACCOUNTS = [
  { email: 'u9250@demo.radar', label: 'Клиент U_9250 · стройка, кредиты и импорт' },
  { email: 'u34911@demo.radar', label: 'Клиент U_34911 · экспорт зерна' },
  { email: 'u26030@demo.radar', label: 'Клиент U_26030 · опт топлива' },
  { email: 'u1465@demo.radar', label: 'Клиент U_1465 · импорт напитков' },
] as const;

/** Аккаунт с двухфакторной защитой: код из приложения — 123456. */
export const DEMO_TOTP_ACCOUNT = { email: 'cfo@demo.radar', code: '123456' } as const;
