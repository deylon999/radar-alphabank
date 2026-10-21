import { apiConfig } from '../../api/config';
import { useQualityMetrics } from '../../api/hooks/quality';
import { Completeness } from '../../features/quality/Completeness';
import styles from '../../features/quality/Quality.module.css';
import { QualitySkeleton } from '../../features/quality/QualitySkeleton';
import { Comments, Questions } from '../../features/quality/RecentList';
import { StatTiles } from '../../features/quality/StatTiles';
import { TopicTable } from '../../features/quality/TopicTable';
import { terms } from '../../shared/labels';
import { useDocumentTitle } from '../../shared/lib/useDocumentTitle';
import { PageTitle } from '../../shared/ui/PageTitle';
import { QueryView } from '../../shared/ui/QueryView';

/** Экран для команды и жюри: как принимают выводы и насколько полно они собраны. */
export function QualityPage() {
  const metrics = useQualityMetrics();
  useDocumentTitle(terms.quality);

  return (
    <>
      <PageTitle>{terms.quality}</PageTitle>
      <p className={styles.intro}>
        Как пользователи принимают выводы и насколько полно они собраны. Считается по всем клиентам
        при каждом открытии экрана.
      </p>
      {apiConfig.useMocks ? (
        <p className={styles.demoNote} role="note">
          Демо: в данных есть несколько тестовых отзывов и вопросов. Ваши оценки, вопросы и скрытые
          выводы из этой вкладки сразу попадают в метрики.
        </p>
      ) : null}
      <QueryView
        query={metrics}
        skeleton={<QualitySkeleton />}
        errorTitle="Не удалось загрузить метрики"
      >
        {(data) => (
          <div className={styles.layout}>
            <StatTiles metrics={data} />
            <div className={styles.columns}>
              <Completeness metrics={data} />
              <TopicTable topics={data.topics} />
            </div>
            <div className={styles.columns}>
              <Comments comments={data.feedback.comments} />
              <Questions questions={data.questions} />
            </div>
          </div>
        )}
      </QueryView>
    </>
  );
}
