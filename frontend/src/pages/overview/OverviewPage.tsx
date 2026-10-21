import { Tab, Tabs } from '@alfalab/core-components/tabs/modern';
import { Link, useSearchParams } from 'react-router';

import { useOverview } from '../../api/hooks/insights';
import { useSelectedCompany } from '../../app/company/selectedCompanyContext';
import { MaterialGroups } from '../../features/overview/MaterialGroups';
import styles from '../../features/overview/Overview.module.css';
import { OverviewSkeleton } from '../../features/overview/OverviewSkeleton';
import { TopicGroups } from '../../features/overview/TopicGroups';
import { terms } from '../../shared/labels';
import { useDocumentTitle } from '../../shared/lib/useDocumentTitle';
import { EmptyState } from '../../shared/ui/EmptyState';
import { PageTitle } from '../../shared/ui/PageTitle';
import { QueryView } from '../../shared/ui/QueryView';

type OverviewView = 'topics' | 'bank';

/** Разрез в адресе (?view=bank): ссылку можно переслать, «Назад» из инсайта его сохраняет. */
function useOverviewView() {
  const [searchParams, setSearchParams] = useSearchParams();
  const view: OverviewView = searchParams.get('view') === 'bank' ? 'bank' : 'topics';
  const setView = (next: OverviewView) => {
    setSearchParams(next === 'bank' ? { view: 'bank' } : {}, {
      replace: true,
      preventScrollReset: true,
    });
  };
  return [view, setView] as const;
}

export function OverviewPage() {
  const company = useSelectedCompany();
  const overview = useOverview(company.id);
  const [view, setView] = useOverviewView();
  useDocumentTitle(terms.overview);

  const content = (
    <QueryView
      query={overview}
      skeleton={<OverviewSkeleton />}
      errorTitle="Не удалось загрузить обзор"
      isEmpty={(data) => (view === 'bank' ? data.materials.length === 0 : data.topics.length === 0)}
      empty={
        <div className={styles.groups}>
          <EmptyState
            title={
              view === 'bank' ? 'Выводов с позицией банка пока нет' : 'Пока нет выводов по компании'
            }
            description="Как только появятся новости, которые касаются компании, они попадут сюда."
          />
        </div>
      }
    >
      {(data) =>
        view === 'bank' ? (
          <MaterialGroups materials={data.materials} />
        ) : (
          <TopicGroups topics={data.topics} />
        )
      }
    </QueryView>
  );

  return (
    <>
      <PageTitle>{terms.overview}</PageTitle>
      <p className={styles.intro}>
        Все актуальные выводы по компании в одном месте: где сосредоточены риски и на какую
        аналитику банка они опираются.
      </p>
      <Tabs
        selectedId={view}
        size="s"
        textStyle="action-primary-medium"
        onChange={(_, { selectedId }) => {
          setView(selectedId === 'bank' ? 'bank' : 'topics');
        }}
      >
        <Tab id="topics" title={terms.byTopic}>
          {view === 'topics' ? content : null}
        </Tab>
        <Tab id="bank" title={terms.byBankMaterial}>
          {view === 'bank' ? content : null}
        </Tab>
      </Tabs>
      <p className={styles.qualityLink}>
        <Link to="/quality">Как мы проверяем качество выводов</Link>
      </p>
    </>
  );
}
