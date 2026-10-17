import { Button } from '@alfalab/core-components/button/modern';
import { FilterMIcon } from '@alfalab/icons-glyph/FilterMIcon';
import cn from 'classnames';
import { useId, useState } from 'react';

import { EVENT_STAGES, INSIGHT_KINDS, URGENCIES } from '../../../schemas/insight';
import { eventStageLabels, insightKindLabels, urgencyLabels } from '../../../shared/labels';
import { countActiveFilters, type FeedParams } from '../feedParams';
import styles from './FeedFilters.module.css';
import { FilterGroup } from './FilterGroup';
import { SearchField } from './SearchField';

interface FeedFiltersProps {
  params: FeedParams;
  onChange: (patch: Partial<FeedParams>) => void;
  onReset: () => void;
}

/** Фильтры ленты. На десктопе открыты в правой колонке, на телефоне — свёрнутый блок. */
export function FeedFilters({ params, onChange, onReset }: FeedFiltersProps) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const active = countActiveFilters(params);

  return (
    <section aria-label="Фильтры" className={styles.root}>
      <Button
        view="secondary"
        size={40}
        block
        className={styles.toggle}
        aria-expanded={open}
        aria-controls={panelId}
        leftAddons={<FilterMIcon aria-hidden="true" />}
        onClick={() => {
          setOpen((value) => !value);
        }}
      >
        {active > 0 ? `Фильтры · ${String(active)}` : 'Фильтры'}
      </Button>
      <div id={panelId} className={cn(styles.panel, open && styles.open)}>
        <SearchField
          value={params.q}
          onChange={(q) => {
            onChange({ q });
          }}
        />
        <FilterGroup
          legend="Тип"
          values={INSIGHT_KINDS}
          labels={insightKindLabels}
          selected={params.kind}
          onChange={(kind) => {
            onChange({ kind });
          }}
        />
        <FilterGroup
          legend="Срочность"
          values={URGENCIES}
          labels={urgencyLabels}
          selected={params.urgency}
          onChange={(urgency) => {
            onChange({ urgency });
          }}
        />
        <FilterGroup
          legend="Стадия события"
          values={EVENT_STAGES}
          labels={eventStageLabels}
          selected={params.stage}
          onChange={(stage) => {
            onChange({ stage });
          }}
        />
        <Button view="text" size={32} disabled={active === 0} onClick={onReset}>
          Сбросить
        </Button>
      </div>
    </section>
  );
}
