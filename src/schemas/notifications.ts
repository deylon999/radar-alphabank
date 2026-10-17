import { z } from 'zod';

import { insightKindSchema } from './insight';

export const DIGEST_FREQUENCIES = ['daily', 'weekly', 'off'] as const;

export const digestFrequencySchema = z.enum(DIGEST_FREQUENCIES);

export const notificationSettingsSchema = z.object({
  telegram: z.object({
    connected: z.boolean(),
    username: z.string().min(1).optional(),
  }),
  /** Какие типы инсайтов присылать срочным уведомлением. */
  urgentKinds: z.array(insightKindSchema),
  digest: digestFrequencySchema,
  /** Время отправки сводки, «09:00». */
  digestTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
});

export const telegramLinkSchema = z.object({ url: z.url() });

export type DigestFrequency = z.infer<typeof digestFrequencySchema>;
export type NotificationSettings = z.infer<typeof notificationSettingsSchema>;
export type TelegramLink = z.infer<typeof telegramLinkSchema>;
