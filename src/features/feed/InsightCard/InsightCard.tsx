import { Link as ActionLink } from '@alfalab/core-components/link/modern';
import cn from 'classnames';
import { useEffect, useId, useRef } from 'react';
import { Link, useLocation } from 'react-router';

import type { Insight } from '../../../schemas/insight';
import { eventStageLabels, pluralForms, terms } from '../../../shared/labels';
import { returnState } from '../../../shared/lib/returnState';
import { pluralize } from '../../../shared/lib/plural';
import { InsightLabels } from '../../../shared/ui/InsightLabels';
import { RelativeTime } from '../../../shared/ui/RelativeTime';
import styles from './InsightCard.module.css';

interface InsightCardProps {
  insight: Insight;
  onHide: (insight: Insight) => void;
}

/** Цепочка без последнего шага: «ваша компания» и так понятна из контекста ленты. */
export function shortImpactPath(insight: Insight): string {
  return insight.impactPath
    .filter((step) => step.role !== 'company')
    .map((step) => step.label)
    .join(' → ');
}

/** Признаки компании, на которых построен вывод: «кредит, лизинг · Китай». */
export function signalSummary(insight: Insight): string {
  return (insight.signals ?? [])
    .slice(0, 2)
    .map((signal) => signal.value)
    .join(' · ');
}

/**
 * Клик по тексту, поднятому над ссылкой ради подсказок (время, «почему», цепочка), тоже
 * открывает инсайт: передаём его ссылке с теми же клавишами — Ctrl/Cmd откроет новую вкладку.
 * Если пользователь выделил текст, чтобы скопировать, карточку не открываем.
 */
function useForwardClicksToLink() {
  const cardRef = useRef<HTMLElement>(null);
  const linkRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return undefined;
    const onClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      if (!target || target.closest('a, button') || window.getSelection()?.toString()) {
        return;
      }
      linkRef.current?.dispatchEvent(
        new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
          button: event.button,
          ctrlKey: event.ctrlKey,
          metaKey: event.metaKey,
          shiftKey: event.shiftKey,
          altKey: event.altKey,
        }),
      );
    };
    card.addEventListener('click', onClick);
    return () => {
      card.removeEventListener('click', onClick);
    };
  }, []);

  return { cardRef, linkRef };
}

/** Карточка ленты: суть за 5 секунд. Вся карточка — одна ссылка на инсайт. */
export function InsightCard({ insight, onHide }: InsightCardProps) {
  const titleId = useId();
  const { cardRef, linkRef } = useForwardClicksToLink();
  const { search } = useLocation();
  const chain = shortImpactPath(insight);
  const signals = signalSummary(insight);
  const hasBankView = insight.bankView !== undefined && !insight.bankView.material.outdated;
  const isUrgentRisk = insight.kind === 'risk' && insight.urgency === 'urgent';

  return (
    <article
      ref={cardRef}
      aria-labelledby={titleId}
      className={cn(
        styles.card,
        isUrgentRisk && styles.urgentRisk,
        insight.kind === 'opportunity' && styles.opportunity,
      )}
    >
      <div className={styles.top}>
        <InsightLabels insight={insight} />
        <span className={styles.stage}>{eventStageLabels[insight.event.stage]}</span>
        <RelativeTime iso={insight.updatedAt} className={styles.time} />
      </div>
      <h2 className={styles.title} id={titleId}>
        <Link
          ref={linkRef}
          to={`/insights/${insight.id}`}
          state={returnState('feed', search)}
          className={styles.link}
          data-card-link=""
        >
          {insight.title}
        </Link>
      </h2>
      <p className={styles.why} title={insight.whyItMatters}>
        {insight.whyItMatters}
      </p>
      <p className={styles.chain} title={chain}>
        {chain}
      </p>
      {signals ? (
        <p className={styles.chain} title={signals}>
          Учтено: {signals}
        </p>
      ) : null}
      <div className={styles.bottom}>
        <span>{pluralize(insight.sources.length, pluralForms.source)}</span>
        {hasBankView ? <span className={styles.bank}>{terms.bankPosition}</span> : null}
        {insight.status === 'new' ? <span className={styles.new}>{terms.newBadge}</span> : null}
        <ActionLink
          pseudo
          view="secondary"
          className={styles.hide}
          aria-label={`Скрыть: ${insight.title}`}
          onClick={() => {
            onHide(insight);
          }}
        >
          Скрыть
        </ActionLink>
      </div>
    </article>
  );
}
