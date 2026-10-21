import { Tag } from '@alfalab/core-components/tag/modern';

import styles from './FeedFilters.module.css';

interface FilterGroupProps<T extends string> {
  legend: string;
  values: readonly T[];
  labels: Record<T, string>;
  selected: readonly T[];
  onChange: (next: T[]) => void;
}

/** Группа переключателей: несколько значений одного фильтра объединяются через «или». */
export function FilterGroup<T extends string>({
  legend,
  values,
  labels,
  selected,
  onChange,
}: FilterGroupProps<T>) {
  return (
    <fieldset className={styles.group}>
      <legend className={styles.legend}>{legend}</legend>
      <div className={styles.tags}>
        {values.map((value) => {
          const checked = selected.includes(value);
          return (
            <Tag
              key={value}
              size={32}
              checked={checked}
              aria-pressed={checked}
              onClick={() => {
                onChange(
                  checked
                    ? selected.filter((item) => item !== value)
                    : values.filter((item) => item === value || selected.includes(item)),
                );
              }}
            >
              {labels[value]}
            </Tag>
          );
        })}
      </div>
    </fieldset>
  );
}
