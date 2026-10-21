import { Button } from '@alfalab/core-components/button/modern';
import { Input } from '@alfalab/core-components/input/modern';
import cn from 'classnames';
import { useEffect, useId, useState } from 'react';

import { type AskResult, useAskInsight } from '../../../api/hooks/insights';
import type { Insight, TraceStep } from '../../../schemas/insight';
import {
  citationKindLabels,
  pluralForms,
  terms,
  traceStepKindLabels,
} from '../../../shared/labels';
import { pluralize } from '../../../shared/lib/plural';
import { useUserRole } from '../../../shared/lib/userRole';
import { Badge } from '../../../shared/ui/Badge/Badge';
import { InsightSection } from '../InsightSection/InsightSection';
import sectionStyles from '../InsightSection/InsightSection.module.css';
import styles from './AskPanel.module.css';

const QUESTION_LIMIT = 500;
/** Обычное время ответа агента; дольше — честно говорим, что ждём дольше обычного. */
const USUAL_WAIT_SECONDS = 30;

/** Текущее время, которое тикает раз в секунду, пока `active`. */
function useNow(active: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return undefined;
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => {
      clearInterval(timer);
    };
  }, [active]);
  return now;
}

function StepList({ steps, live = false }: { steps: TraceStep[]; live?: boolean }) {
  return (
    <ol className={styles.steps} aria-label="Шаги агента" aria-live={live ? 'polite' : undefined}>
      {steps.map((step, index) => (
        <li
          // Шаги только добавляются в конец — индекс как ключ безопасен.
          key={index}
          className={cn(styles.step, live && index === steps.length - 1 && styles.stepCurrent)}
        >
          <span className={styles.stepKind}>{traceStepKindLabels[step.kind]}</span>
          <span>
            {step.title}
            {step.detail ? <span className={sectionStyles.muted}> — {step.detail}</span> : null}
          </span>
        </li>
      ))}
    </ol>
  );
}

/**
 * Пока агент готовит ответ: сколько ждём, его шаги — если бэкенд их присылает — и отмена.
 * Шагов-заглушек нет: показываем только то, что пришло от агента.
 */
function AskProgress({ steps, onCancel }: { steps: TraceStep[]; onCancel: () => void }) {
  // Блок появляется вместе с запросом — момент его появления и есть начало ожидания.
  const [startedAt] = useState(() => Date.now());
  const seconds = Math.max(0, Math.floor((useNow(true) - startedAt) / 1000));
  return (
    <div className={styles.progress}>
      <div className={styles.progressHead}>
        <span className={styles.pulse} aria-hidden="true" />
        <p role="status">
          {seconds < USUAL_WAIT_SECONDS
            ? 'Агент готовит ответ — обычно до 30 секунд'
            : 'Агент работает дольше обычного, ответ ещё готовится'}
        </p>
        <span className={styles.elapsed} aria-hidden="true">
          {seconds} с
        </span>
      </div>
      {steps.length > 0 ? <StepList steps={steps} live /> : null}
      <div>
        <Button view="secondary" size={32} onClick={onCancel}>
          Отменить
        </Button>
      </div>
    </div>
  );
}

function AnswerItem({ result: { answer, steps } }: { result: AskResult }) {
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
      {steps.length > 0 ? (
        <details className={styles.trace}>
          <summary className={styles.traceSummary}>
            Как агент искал ответ · {pluralize(steps.length, pluralForms.step)}
          </summary>
          <StepList steps={steps} />
        </details>
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
  const [answers, setAnswers] = useState<AskResult[]>([]);
  const inputId = useId();

  const submit = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || ask.isPending) {
      return;
    }
    ask.mutate(
      { question: trimmed, role },
      {
        onSuccess: (result) => {
          setAnswers((current) => [result, ...current]);
          setQuestion('');
        },
      },
    );
  };

  const suggestions = (insight.suggestedQuestions ?? []).filter(
    (suggestion) => !answers.some(({ answer }) => answer.question === suggestion),
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
        {ask.isPending ? <AskProgress steps={ask.steps} onCancel={ask.cancel} /> : null}
        {ask.isError ? (
          <p className={styles.error} role="alert">
            Не удалось получить ответ. Попробуйте ещё раз.
          </p>
        ) : null}
        {answers.length > 0 ? (
          <ol className={styles.answers} aria-label="Ответы">
            {answers.map((result, index) => (
              // Ответы только добавляются в начало: ключ — их число на момент ответа.
              <AnswerItem key={answers.length - index} result={result} />
            ))}
          </ol>
        ) : null}
      </div>
    </InsightSection>
  );
}
