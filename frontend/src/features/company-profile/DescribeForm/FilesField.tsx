import { Button } from '@alfalab/core-components/button/modern';
import { Dropzone } from '@alfalab/core-components/dropzone/modern';
import { IconButton } from '@alfalab/core-components/icon-button/modern';
import { CrossMIcon } from '@alfalab/icons-glyph/CrossMIcon';
import cn from 'classnames';
import { type SVGProps, useId, useRef } from 'react';

import { ACCEPTED_FILES, FILE_RULES_HINT, formatFileSize } from './materials';
import type { DescribeFormState } from './useDescribeForm';
import styles from './DescribeForm.module.css';

/** Иконка декоративная: доступное имя есть у самой кнопки. */
function RemoveIcon(props: SVGProps<SVGSVGElement>) {
  return <CrossMIcon {...props} aria-hidden="true" />;
}

/**
 * Подсказка поверх зоны во время перетаскивания. Своя вместо стандартной: у иконки
 * в стандартной role="img" без подписи — нарушение axe.
 */
function DropOverlay({ text, visible }: { text?: string; visible?: boolean }) {
  return visible ? <div className={styles.dropOverlay}>{text}</div> : null;
}

type FilesFieldProps = Pick<DescribeFormState, 'files' | 'addFiles' | 'removeFile'> & {
  disabled: boolean;
};

/**
 * Документы: перетаскиванием или кнопкой «Выбрать файлы» — второй путь нужен для клавиатуры
 * и телефона. Неподходящий файл остаётся в списке с причиной и на сервер не уходит.
 */
export function FilesField({ files, addFiles, removeFile, disabled }: FilesFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const labelId = useId();
  const hintId = useId();

  return (
    <div className={styles.field} role="group" aria-labelledby={labelId}>
      <span id={labelId} className={styles.label}>
        Документы
      </span>
      <Dropzone
        block
        disabled={disabled}
        text="Отпустите файлы здесь"
        Overlay={DropOverlay}
        onDrop={addFiles}
      >
        <div className={styles.dropzoneContent}>
          <p className={styles.dropzoneText}>Перетащите файлы сюда или</p>
          <Button
            view="secondary"
            size={40}
            disabled={disabled}
            aria-describedby={hintId}
            onClick={() => inputRef.current?.click()}
          >
            Выбрать файлы
          </Button>
          <p id={hintId} className={styles.hint}>
            {FILE_RULES_HINT}
          </p>
        </div>
      </Dropzone>
      <input
        ref={inputRef}
        type="file"
        multiple
        hidden
        accept={ACCEPTED_FILES}
        aria-label="Выбрать файлы"
        onChange={(event) => {
          addFiles(Array.from(event.currentTarget.files ?? []));
          // Сбрасываем, чтобы тот же файл можно было выбрать ещё раз после удаления.
          event.currentTarget.value = '';
        }}
      />
      {files.length > 0 ? (
        <ul className={styles.files} aria-label="Выбранные файлы">
          {/* Свой список, а не FileUploadItem: у его кнопки удаления одно имя «удалить» на все файлы. */}
          {files.map(({ id, file, problem }) => (
            <li key={id} className={cn(styles.linkItem, problem && styles.rejectedFile)}>
              <span className={styles.fileInfo}>
                <span className={styles.linkText} title={file.name}>
                  {file.name}
                </span>
                <span className={problem ? styles.fileProblem : styles.hint}>
                  {problem ?? formatFileSize(file.size)}
                </span>
              </span>
              <IconButton
                icon={RemoveIcon}
                size={24}
                disabled={disabled}
                aria-label={`Убрать файл ${file.name}`}
                onClick={() => {
                  removeFile(id);
                }}
              />
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
