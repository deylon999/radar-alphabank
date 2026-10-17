import { Button } from '@alfalab/core-components/button/modern';

import { ButtonLink } from '../../shared/ui/ButtonLink';
import { EmptyState } from '../../shared/ui/EmptyState';
import type { FeedTab } from './feedParams';

interface FeedEmptyProps {
  tab: FeedTab;
  hasFilters: boolean;
  onResetFilters: () => void;
}

/** Пустая лента подсказывает, что делать дальше. */
export function FeedEmpty({ tab, hasFilters, onResetFilters }: FeedEmptyProps) {
  if (hasFilters) {
    return (
      <EmptyState
        title="Ничего не нашлось"
        description="Измените условия или сбросьте фильтры."
        action={
          <Button view="secondary" size={40} onClick={onResetFilters}>
            Сбросить фильтры
          </Button>
        }
      />
    );
  }
  if (tab === 'watch') {
    return (
      <EmptyState
        title="Под наблюдением пока пусто"
        description="Здесь появятся события, которые могут коснуться компании."
        action={
          <ButtonLink to="/" view="secondary" size={40}>
            Открыть главное
          </ButtonLink>
        }
      />
    );
  }
  return (
    <EmptyState
      title="Пока ничего важного"
      description="Уточните профиль компании — лента станет точнее."
      action={
        <ButtonLink to="/company" view="secondary" size={40}>
          Уточнить профиль
        </ButtonLink>
      }
    />
  );
}
