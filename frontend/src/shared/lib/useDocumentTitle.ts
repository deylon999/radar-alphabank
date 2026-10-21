import { useEffect } from 'react';

import { terms } from '../labels';

/** Заголовок вкладки: «Лента — Радар». Без аргумента — только название продукта. */
export function useDocumentTitle(title?: string): void {
  useEffect(() => {
    document.title = title ? `${title} — ${terms.productName}` : terms.productName;
  }, [title]);
}
