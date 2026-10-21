import { Button } from '@alfalab/core-components/button/modern';

import { describeLoadError } from '../lib/loadError';
import { StateMessage } from './StateMessage/StateMessage';

interface ErrorStateProps {
  /** «Не удалось загрузить ленту». */
  title: string;
  error: unknown;
  onRetry: () => void;
  retrying?: boolean;
}

export function ErrorState({ title, error, onRetry, retrying = false }: ErrorStateProps) {
  return (
    <StateMessage
      role="alert"
      title={title}
      description={describeLoadError(error)}
      action={
        <Button view="secondary" size={40} loading={retrying} onClick={onRetry}>
          Повторить
        </Button>
      }
    />
  );
}
