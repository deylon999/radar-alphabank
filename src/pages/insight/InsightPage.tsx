import { Link, useParams } from 'react-router';

import { InsightPreview } from '../../features/insight/InsightPreview';
import { terms } from '../../shared/labels';
import styles from './InsightPage.module.css';

export function InsightPage() {
  const { insightId = '' } = useParams();
  return (
    <>
      <nav aria-label="Хлебные крошки" className={styles.breadcrumbs}>
        <Link to="/">{terms.feed}</Link>
      </nav>
      <InsightPreview insightId={insightId} />
    </>
  );
}
