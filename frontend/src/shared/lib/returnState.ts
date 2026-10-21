/** Раздел, из которого открыли инсайт: в крошках будет он, а не всегда «Лента». */
export type ReturnSection = 'feed' | 'overview';

/** Состояние перехода к инсайту: откуда пришли и с какими параметрами адреса. */
export interface ReturnState {
  from: ReturnSection;
  search: string;
}

export const returnPaths: Record<ReturnSection, string> = { feed: '/', overview: '/overview' };

export function returnState(from: ReturnSection, search: string): ReturnState {
  return { from, search };
}

/** location.state приходит как unknown — проверяем форму, а не приводим тип. */
export function readReturnState(state: unknown): ReturnState | null {
  if (typeof state === 'object' && state !== null && 'from' in state && 'search' in state) {
    const { from, search } = state;
    if (
      (from === 'feed' || from === 'overview') &&
      typeof search === 'string' &&
      (search === '' || search.startsWith('?'))
    ) {
      return { from, search };
    }
  }
  return null;
}
