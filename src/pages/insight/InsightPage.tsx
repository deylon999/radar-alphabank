import { useParams } from 'react-router';

import { InsightView } from '../../features/insight/InsightView';

export function InsightPage() {
  const { insightId = '' } = useParams();
  // key: при переходе к другому инсайту состояние (чек-лист, отзыв) начинается заново.
  return <InsightView key={insightId} insightId={insightId} />;
}
