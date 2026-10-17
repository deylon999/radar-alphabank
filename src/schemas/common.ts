import { z } from 'zod';

/** Дата и время в ISO 8601 со смещением или Z: «2026-10-18T09:20:00Z». */
export const isoDateTimeSchema = z.iso.datetime({ offset: true });

/** Тело ошибки, которое возвращает бэкенд. */
export const apiErrorBodySchema = z.object({ message: z.string() });
