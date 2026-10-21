import { Button } from '@alfalab/core-components/button/modern';
import { IconButton } from '@alfalab/core-components/icon-button/modern';
import { Input } from '@alfalab/core-components/input/modern';
import { CrossMIcon } from '@alfalab/icons-glyph/CrossMIcon';
import { type SVGProps, useId } from 'react';

import type { DescribeFormState } from './useDescribeForm';
import styles from './DescribeForm.module.css';

/** Иконка декоративная: доступное имя есть у самой кнопки. */
function RemoveIcon(props: SVGProps<SVGSVGElement>) {
  return <CrossMIcon {...props} aria-hidden="true" />;
}

type LinksFieldProps = Pick<
  DescribeFormState,
  'links' | 'removeLink' | 'linkDraft' | 'setLinkDraft' | 'linkError' | 'addLink'
> & { disabled: boolean };

/** Ссылки на сайт, презентацию, новости о компании: добавляются по одной. */
export function LinksField({
  links,
  removeLink,
  linkDraft,
  setLinkDraft,
  linkError,
  addLink,
  disabled,
}: LinksFieldProps) {
  const inputId = useId();
  const errorId = useId();

  return (
    <div className={styles.field}>
      <label htmlFor={inputId} className={styles.label}>
        Ссылки
      </label>
      <p className={styles.hint}>Сайт компании, страница о&nbsp;компании, новости о&nbsp;вас</p>
      <div className={styles.linkRow}>
        <Input
          id={inputId}
          size={48}
          block
          inputMode="url"
          placeholder="company.ru/about"
          value={linkDraft}
          disabled={disabled}
          error={linkError ? true : undefined}
          aria-invalid={linkError ? true : undefined}
          aria-describedby={linkError ? errorId : undefined}
          onChange={(_, { value }) => {
            setLinkDraft(value);
          }}
          onKeyDown={(event) => {
            // Enter в поле ссылки добавляет ссылку, а не отправляет всю форму.
            if (event.key === 'Enter') {
              event.preventDefault();
              addLink();
            }
          }}
        />
        <Button view="secondary" size={48} disabled={disabled} onClick={addLink}>
          Добавить
        </Button>
      </div>
      {linkError ? (
        <p id={errorId} className={styles.error} role="alert">
          {linkError}
        </p>
      ) : null}
      {links.length > 0 ? (
        <ul className={styles.links} aria-label="Добавленные ссылки">
          {links.map((link) => (
            <li key={link} className={styles.linkItem}>
              <span className={styles.linkText} title={link}>
                {link}
              </span>
              <IconButton
                icon={RemoveIcon}
                size={24}
                disabled={disabled}
                aria-label={`Убрать ссылку ${link}`}
                onClick={() => {
                  removeLink(link);
                }}
              />
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
