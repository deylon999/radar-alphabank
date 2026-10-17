import { FormControl } from '@alfalab/core-components/form-control/modern';
import { ChevronDownMIcon } from '@alfalab/icons-glyph/ChevronDownMIcon';
import { useState } from 'react';

import styles from './NativeSelectField.module.css';

export interface SelectOption {
  value: string;
  label: string;
}

interface NativeSelectFieldProps {
  label: string;
  value: string;
  options: readonly SelectOption[];
  onChange: (value: string) => void;
  size?: 40 | 48 | 56;
  className?: string;
}

/**
 * Выпадающий список на нативном <select> в оболочке поля core-components.
 * Select из библиотеки не проходит axe (у combobox нет имени, неверные aria-атрибуты),
 * а нативный список доступен с клавиатуры, читается скринридерами и на телефоне
 * открывает системный выбор.
 */
export function NativeSelectField({
  label,
  value,
  options,
  onChange,
  size = 48,
  className,
}: NativeSelectFieldProps) {
  const [focused, setFocused] = useState(false);
  const selected = options.find((option) => option.value === value);

  return (
    <FormControl
      className={className}
      fieldClassName={styles.field}
      label={label}
      size={size}
      block
      filled
      focused={focused}
      rightAddons={<ChevronDownMIcon aria-hidden="true" className={styles.chevron} />}
    >
      <span className={styles.value} aria-hidden="true" title={selected?.label}>
        {selected?.label}
      </span>
      <select
        aria-label={label}
        className={styles.select}
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
        }}
        onFocus={() => {
          setFocused(true);
        }}
        onBlur={() => {
          setFocused(false);
        }}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </FormControl>
  );
}
