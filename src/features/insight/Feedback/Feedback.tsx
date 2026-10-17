import { Button } from '@alfalab/core-components/button/modern';
import { Textarea } from '@alfalab/core-components/textarea/modern';
import { useId, useState } from 'react';

import { useSendInsightFeedback } from '../../../api/hooks/insights';
import { terms } from '../../../shared/labels';
import { InsightSection } from '../InsightSection/InsightSection';
import sectionStyles from '../InsightSection/InsightSection.module.css';
import styles from './Feedback.module.css';

const COMMENT_LIMIT = 2000;

/**
 * Обратная связь добровольная и ничего не блокирует: оценка уходит одним нажатием,
 * комментарий — по желанию после неё.
 */
export function Feedback({ insightId }: { insightId: string }) {
  const send = useSendInsightFeedback(insightId);
  const [useful, setUseful] = useState<boolean | null>(null);
  const [comment, setComment] = useState('');
  const [commentSent, setCommentSent] = useState(false);
  const commentId = useId();

  const rate = (value: boolean) => {
    setUseful(value);
    send.mutate({ useful: value });
  };
  const rated = useful !== null && send.isSuccess;

  return (
    <InsightSection title={terms.feedback}>
      <p className={sectionStyles.muted}>Инсайт был полезен?</p>
      <div className={styles.rating}>
        {[true, false].map((value) => (
          <Button
            key={String(value)}
            // Выбранная оценка — тёмная кнопка: видно, что отзыв уже оставлен.
            view={useful === value ? 'primary' : 'secondary'}
            size={40}
            aria-pressed={useful === value}
            loading={send.isPending && useful === value && !comment}
            onClick={() => {
              rate(value);
            }}
          >
            {value ? 'Полезно' : 'Не полезно'}
          </Button>
        ))}
      </div>
      {send.isError ? (
        <p className={styles.error} role="alert">
          Не удалось отправить отзыв. Попробуйте ещё раз.
        </p>
      ) : null}
      {rated && !commentSent ? (
        <form
          className={styles.comment}
          onSubmit={(event) => {
            event.preventDefault();
            send.mutate(
              { useful, comment: comment.trim() },
              {
                onSuccess: () => {
                  setCommentSent(true);
                },
              },
            );
          }}
        >
          <p className={sectionStyles.muted} role="status">
            Спасибо, отзыв учтён.
          </p>
          {/* Своя подпись: подпись Textarea из библиотеки не связана с полем для скринридера. */}
          <label htmlFor={commentId} className={sectionStyles.muted}>
            Комментарий — необязательно
          </label>
          <Textarea
            id={commentId}
            block
            minRows={2}
            maxLength={COMMENT_LIMIT}
            value={comment}
            onChange={(_, { value }) => {
              setComment(value);
            }}
          />
          <Button
            type="submit"
            view="secondary"
            size={40}
            disabled={!comment.trim()}
            loading={send.isPending}
          >
            Добавить комментарий
          </Button>
        </form>
      ) : null}
      {commentSent ? (
        <p className={sectionStyles.muted} role="status">
          Спасибо, комментарий получен.
        </p>
      ) : null}
    </InsightSection>
  );
}
