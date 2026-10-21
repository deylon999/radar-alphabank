import { useCallback, useState } from 'react';
import { z } from 'zod';

import { safeStorage } from '../../../shared/lib/safeStorage';

const storedSchema = z.array(z.string());
const storageKey = (insightId: string) => `radar.checks.${insightId}`;

function load(insightId: string): string[] {
  try {
    const parsed = storedSchema.safeParse(
      JSON.parse(safeStorage.get(storageKey(insightId)) ?? '[]'),
    );
    return parsed.success ? parsed.data : [];
  } catch {
    return [];
  }
}

/**
 * Отметки «Что проверить» живут в браузере: в контракте API для них нет.
 * Храним тексты пунктов, а не номера: если список поменяется, отметки не съедут.
 */
export function useChecklist(insightId: string, checks: readonly string[]) {
  const [done, setDone] = useState(() => new Set(load(insightId)));

  const toggle = useCallback(
    (check: string, checked: boolean) => {
      setDone((current) => {
        const next = new Set(current);
        if (checked) next.add(check);
        else next.delete(check);
        safeStorage.set(storageKey(insightId), JSON.stringify([...next]));
        return next;
      });
    },
    [insightId],
  );

  const doneCount = checks.filter((check) => done.has(check)).length;
  return { isDone: (check: string) => done.has(check), toggle, doneCount };
}
