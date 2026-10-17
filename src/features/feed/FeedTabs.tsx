import { Tab, Tabs } from '@alfalab/core-components/tabs/modern';
import type { ReactNode } from 'react';

import { terms } from '../../shared/labels';
import type { FeedTab } from './feedParams';

interface FeedTabsProps {
  tab: FeedTab;
  onChange: (tab: FeedTab) => void;
  /** Содержимое выбранной вкладки — лента с нужным видом связи. */
  children: ReactNode;
}

/** «Главное» — прямая связь с компанией, «Под наблюдением» — возможная. */
export function FeedTabs({ tab, onChange, children }: FeedTabsProps) {
  return (
    <Tabs
      selectedId={tab}
      size="s"
      textStyle="action-primary-medium"
      onChange={(_, { selectedId }) => {
        onChange(selectedId === 'watch' ? 'watch' : 'main');
      }}
    >
      <Tab id="main" title={terms.mainTab}>
        {tab === 'main' ? children : null}
      </Tab>
      <Tab id="watch" title={terms.watchTab}>
        {tab === 'watch' ? children : null}
      </Tab>
    </Tabs>
  );
}
