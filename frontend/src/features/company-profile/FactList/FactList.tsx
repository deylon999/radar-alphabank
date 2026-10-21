import { FACT_CATEGORIES, type ProfileFact } from '../../../schemas/company';
import { factCategoryLabels } from '../../../shared/labels';
import { FactItem } from './FactItem';
import styles from './FactList.module.css';
import type { FactActions } from './useFactActions';

/**
 * Порядок внутри категории — как у сервера, без пересортировки по статусу:
 * подтверждённый факт остаётся на месте, а не прыгает по списку из-под курсора.
 */
function groupFacts(facts: readonly ProfileFact[]) {
  return FACT_CATEGORIES.map((category) => ({
    category,
    facts: facts.filter((fact) => fact.category === category),
  })).filter((group) => group.facts.length > 0);
}

interface FactListProps {
  facts: readonly ProfileFact[];
  actions: FactActions;
}

/** Факты профиля по категориям с русскими подписями — в порядке категорий из контракта. */
export function FactList({ facts, actions }: FactListProps) {
  return (
    <div className={styles.groups}>
      {groupFacts(facts).map((group) => (
        <section
          key={group.category}
          aria-labelledby={`facts-${group.category}`}
          className={styles.group}
        >
          <h3 id={`facts-${group.category}`} className={styles.groupTitle}>
            {factCategoryLabels[group.category]}{' '}
            <span className={styles.count}>{group.facts.length}</span>
          </h3>
          <ul className={styles.list}>
            {group.facts.map((fact) => (
              <FactItem key={fact.id} fact={fact} actions={actions} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
