import { useSelectedCompany } from '../../app/company/selectedCompanyContext';
import { DigestBar } from '../../features/feed/DigestBar/DigestBar';
import { FeedFilters } from '../../features/feed/FeedFilters/FeedFilters';
import { FeedList } from '../../features/feed/FeedList';
import { FeedTabs } from '../../features/feed/FeedTabs';
import { TelegramPromo } from '../../features/feed/TelegramPromo/TelegramPromo';
import { useFeedParams } from '../../features/feed/useFeedParams';
import { terms } from '../../shared/labels';
import { useDocumentTitle } from '../../shared/lib/useDocumentTitle';
import { PageTitle } from '../../shared/ui/PageTitle';
import styles from './FeedPage.module.css';

export function FeedPage() {
  const company = useSelectedCompany();
  const { params, update, resetFilters } = useFeedParams();
  useDocumentTitle(terms.feed);

  return (
    <div className={styles.layout}>
      <div className={styles.main}>
        <div className={styles.head}>
          <PageTitle>{terms.feed}</PageTitle>
          <DigestBar
            companyId={company.id}
            onSelect={(filter) => {
              update({ ...filter, tab: 'main', stage: [], q: '' });
            }}
          />
        </div>
        <div className={styles.feed}>
          <FeedTabs
            tab={params.tab}
            onChange={(tab) => {
              update({ tab });
            }}
          >
            <div className={styles.list}>
              <FeedList companyId={company.id} params={params} onResetFilters={resetFilters} />
            </div>
          </FeedTabs>
        </div>
      </div>
      <div className={styles.aside}>
        <div className={styles.promo}>
          <TelegramPromo />
        </div>
        <div className={styles.filters}>
          <FeedFilters params={params} onChange={update} onReset={resetFilters} />
        </div>
      </div>
    </div>
  );
}
