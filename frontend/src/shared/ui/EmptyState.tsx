import type { ReactNode } from 'react';

import { StateMessage } from './StateMessage/StateMessage';

interface EmptyStateProps {
  title: string;
  /** Подсказка, что делать: «Уточните профиль компании — лента станет точнее». */
  description?: ReactNode;
  action?: ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return <StateMessage role="status" title={title} description={description} action={action} />;
}
