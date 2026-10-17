import type { Insight } from '../../schemas/insight';
import { eventStageLabels, terms } from '../../shared/labels';
import { formatFullDate } from '../../shared/lib/date';
import { InsightSection } from './InsightSection/InsightSection';
import styles from './WhatHappened.module.css';

/** Что случилось: событие, стадия, место, дата. */
export function WhatHappened({ insight }: { insight: Insight }) {
  const { event } = insight;
  return (
    <InsightSection title={terms.whatHappened}>
      <dl className={styles.facts}>
        <dt>Событие</dt>
        <dd>{event.title}</dd>
        <dt>Стадия</dt>
        <dd>{eventStageLabels[event.stage]}</dd>
        {event.place ? (
          <>
            <dt>Место</dt>
            <dd>{event.place}</dd>
          </>
        ) : null}
        {event.occurredAt ? (
          <>
            <dt>Когда</dt>
            <dd>
              <time dateTime={event.occurredAt}>{formatFullDate(event.occurredAt)}</time>
            </dd>
          </>
        ) : null}
      </dl>
    </InsightSection>
  );
}
