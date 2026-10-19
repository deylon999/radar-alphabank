/** Состояние перехода «лента → инсайт»: с какими фильтрами открыли карточку. */
export interface FeedReturnState {
  feedSearch: string;
}

export function feedReturnState(search: string): FeedReturnState {
  return { feedSearch: search };
}

/** location.state приходит как unknown — проверяем форму, а не приводим тип. */
export function readFeedReturn(state: unknown): FeedReturnState | null {
  if (typeof state === 'object' && state !== null && 'feedSearch' in state) {
    const { feedSearch } = state;
    if (typeof feedSearch === 'string' && (feedSearch === '' || feedSearch.startsWith('?'))) {
      return { feedSearch };
    }
  }
  return null;
}
