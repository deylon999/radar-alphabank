import { CheckmarkMIcon } from '@alfalab/icons-glyph/CheckmarkMIcon';
import { ChevronDownMIcon } from '@alfalab/icons-glyph/ChevronDownMIcon';
import cn from 'classnames';
import { useId } from 'react';

import type { Company } from '../../schemas/company';
import styles from './CompanySwitcher.module.css';
import { useMenu } from './useMenu';

interface CompanyMenuProps {
  company: Company;
  companies: readonly Company[];
  onSelect: (companyId: string) => void;
}

/**
 * Переключатель для мыши: кнопка с названием и меню компаний. Внешне повторяет выпадающий
 * список Select из core-components (размеры и цвета взяты из его CSS), но доступен:
 * у Select из библиотеки обёртка-combobox без имени и иконка галочки без подписи (axe).
 * Пункты — menuitemradio, выбранный отмечен галочкой сразу после названия.
 */
export function CompanyMenu({ company, companies, onSelect }: CompanyMenuProps) {
  const selectedIndex = Math.max(
    companies.findIndex((item) => item.id === company.id),
    0,
  );
  const { open, rootRef, triggerRef, setItemRef, toggle, close, onTriggerKeyDown, onMenuKeyDown } =
    useMenu(companies.length, selectedIndex);
  const menuId = useId();

  return (
    <div ref={rootRef} className={styles.menuRoot}>
      <button
        ref={triggerRef}
        type="button"
        className={cn(styles.root, styles.trigger)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={`Компания: ${company.name}`}
        title={company.name}
        onClick={toggle}
        onKeyDown={onTriggerKeyDown}
      >
        <span className={styles.value}>{company.name}</span>
        <ChevronDownMIcon
          aria-hidden="true"
          className={cn(styles.chevron, open && styles.chevronOpen)}
        />
      </button>
      {open ? (
        <div id={menuId} role="menu" aria-label="Компания" className={styles.menu}>
          {companies.map((item, index) => {
            const checked = item.id === company.id;
            return (
              <button
                key={item.id}
                ref={(node) => {
                  setItemRef(index, node);
                }}
                type="button"
                role="menuitemradio"
                aria-checked={checked}
                tabIndex={-1}
                className={styles.item}
                onClick={() => {
                  close(true);
                  if (!checked) {
                    onSelect(item.id);
                  }
                }}
                onKeyDown={(event) => {
                  onMenuKeyDown(event, index);
                }}
              >
                <span className={styles.itemText}>
                  <span className={styles.itemName}>{item.name}</span>
                  <span className={styles.itemIndustry}>{item.industry}</span>
                </span>
                {checked ? <CheckmarkMIcon aria-hidden="true" className={styles.check} /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
