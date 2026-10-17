import { Typography } from '@alfalab/core-components/typography/modern';

import { useInsight } from '../../api/hooks/insights';
import { insightKindLabels, terms } from '../../shared/labels';
import { useDocumentTitle } from '../../shared/lib/useDocumentTitle';
import { PageTitle } from '../../shared/ui/PageTitle';
import { QueryView } from '../../shared/ui/QueryView';
import { PageSkeleton } from '../../shared/ui/Skeleton/PageSkeleton';

/** Временное содержимое карточки для проверки оболочки. Полная карточка — в шаге 5. */
export function InsightPreview({ insightId }: { insightId: string }) {
  const query = useInsight(insightId);
  useDocumentTitle(query.data?.title ?? terms.insight);
  return (
    <QueryView
      query={query}
      skeleton={<PageSkeleton blocks={2} />}
      errorTitle="Не удалось загрузить инсайт"
    >
      {(insight) => (
        <>
          <PageTitle>{insight.title}</PageTitle>
          <Typography.Text tag="p" view="primary-medium">
            {insightKindLabels[insight.kind]}. {insight.whyItMatters}
          </Typography.Text>
        </>
      )}
    </QueryView>
  );
}
