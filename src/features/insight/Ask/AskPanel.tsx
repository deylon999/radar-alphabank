import { Button } from '@alfalab/core-components/button/modern';
import { Input } from '@alfalab/core-components/input/modern';
import { useId, useState } from 'react';

import { useAskInsight } from '../../../api/hooks/insights';
import type { Answer, Insight } from '../../../schemas/insight';
import { citationKindLabels, terms } from '../../../shared/labels';
import { useUserRole } from '../../../shared/lib/userRole';
import { Badge } from '../../../shared/ui/Badge/Badge';
import { InsightSection } from '../InsightSection/InsightSection';
import sectionStyles from '../InsightSection/InsightSection.module.css';
import styles from './AskPanel.module.css';

const QUESTION_LIMIT = 500;

function AnswerItem({ answer }: { answer: Answer }) {
  return (
    <li className={styles.answer}>
      <p className={styles.question}>{answer.question}</p>
      <p>{answer.answer}</p>
      {answer.citations.length > 0 ? (
        <>
          <p className={sectionStyles.muted}>На что опирается ответ:</p>
          <ul className={styles.citations}>
            {answer.citations.map((citation) => (
              <li key={`${citation.kind}-${citation.label}`}>
                <span className={sectionStyles.muted}>{citationKindLabels[citation.kind]}: </span>
                {citation.url ? (
                  <a
                    href={citation.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.link}
                  >
                    {citation.label}
                  </a>
                ) : (
                  citation.label
                )}
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </li>
  );
}

/**
 * Уточняющий вопрос по инсайту. Ответ готовит модель, поэтому раздел подписан «Вывод AI»,
 * а у каждого ответа видно, на какие материалы банка, данные клиента и новости он опирается.
 */
export function AskPanel({ insight }: { insight: Insight }) {
  const ask = useAskInsight(insight.id);
  const [role] = useUserRole();
  const [question, setQuestion] = useState('');
  const [answers, setAnswers] = useState<Answer[]>([]);
  const inputId = useId();

  const submit = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || ask.isPending) {
      return;
    }
    ask.mutate(
      { question: trimmed, role },
      {
        onSuccess: (answer) => {
          setAnswers((current) => [answer, ...current]);
          setQuestion('');
        },
      },
    );
  };

  const suggestions = (insight.suggestedQuestions ?? []).filter(
    (suggestion) => !answers.some((answer) => answer.question === suggestion),
  );

  return (
    <InsightSection title={terms.ask} meta={<Badge tone="quiet">{terms.aiConclusion}</Badge>}>
      <div className={styles.panel}>
        {suggestions.length > 0 ? (
          <div className={styles.suggestions}>
            {suggestions.map((suggestion) => (
              <Button
                key={suggestion}
                view="secondary"
                size={32}
                disabled={ask.isPending}
                onClick={() => {
                  submit(suggestion);
                }}
              >
                {suggestion}
              </Button>
            ))}
          </div>
        ) : null}
        <form
          className={styles.form}
          onSubmit={(event) => {
            event.preventDefault();
            submit(question);
          }}
        >
          <label htmlFor={inputId} className={sectionStyles.muted}>
            Свой вопрос об этом инсайте
          </label>
          <div className={styles.row}>
            <Input
              id={inputId}
              size={40}
              block
              maxLength={QUESTION_LIMIT}
              placeholder="Например: что будет через полгода?"
              value={question}
              onChange={(_, { value }) => {
                setQuestion(value);
              }}
            />
            <Button
              type="submit"
              view="primary"
              size={40}
              loading={ask.isPending}
              disabled={!question.trim()}
            >
              Спросить
            </Button>
          </div>
        </form>
        {ask.isPending ? (
          <p className={sectionStyles.muted} role="status">
            Готовим ответ по аналитике банка и данным компании…
          </p>
        ) : null}
        {ask.isError ? (
          <p className={styles.error} role="alert">
            Не удалось получить ответ. Попробуйте ещё раз.
          </p>
        ) : null}
        {answers.length > 0 ? (
          <ol className={styles.answers} aria-label="Ответы">
            {answers.map((answer, index) => (
              // Ответы только добавляются в начало: ключ — их число на момент ответа.
              <AnswerItem key={answers.length - index} answer={answer} />
            ))}
          </ol>
        ) : null}
      </div>
    </InsightSection>
  );
}
