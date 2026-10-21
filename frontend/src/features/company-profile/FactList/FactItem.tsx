import { Button } from '@alfalab/core-components/button/modern';
import cn from 'classnames';
import { useEffect, useId, useRef, useState } from 'react';

import type { FactStatus, ProfileFact } from '../../../schemas/company';
import { factSourceKindLabels, factStatusLabels } from '../../../shared/labels';
import { Badge, type BadgeTone } from '../../../shared/ui/Badge/Badge';
import { FactEditor } from './FactEditor';
import type { FactActions } from './useFactActions';
import styles from './FactList.module.css';

const statusTone: Record<FactStatus, BadgeTone> = {
  confirmed: 'positive',
  pending: 'attention',
  rejected: 'quiet',
};

interface FactItemProps {
  fact: ProfileFact;
  actions: FactActions;
}

/** Факт профиля: формулировка, источник, статус и действия «Подтвердить», «Исправить», «Отклонить». */
export function FactItem({ fact, actions }: FactItemProps) {
  const [editing, setEditing] = useState(false);
  const statementId = useId();
  const busy = actions.busyFactId === fact.id || actions.isConfirmingAll;
  const editButton = useRef<HTMLButtonElement>(null);
  const returnFocus = useRef(false);

  // После правки фокус возвращается на «Исправить» — когда кнопка снова станет активной.
  useEffect(() => {
    if (returnFocus.current && !editing && !busy) {
      returnFocus.current = false;
      editButton.current?.focus();
    }
  }, [editing, busy]);

  // «Подтвердить» и «Отклонить» исчезают после нажатия — не теряем фокус вместе с ними.
  const shownStatus = useRef(fact.status);
  useEffect(() => {
    if (shownStatus.current === fact.status) return;
    shownStatus.current = fact.status;
    const active = document.activeElement;
    if (!active || active === document.body || !active.isConnected) {
      editButton.current?.focus();
    }
  }, [fact.status]);

  return (
    <li className={cn(styles.fact, fact.status === 'rejected' && styles.rejected)}>
      <div className={styles.factHead}>
        <Badge tone={statusTone[fact.status]}>{factStatusLabels[fact.status]}</Badge>
        <span className={styles.source} title={fact.source.label}>
          {factSourceKindLabels[fact.source.kind]}
          {fact.source.kind === 'text' ? '' : ` · ${fact.source.label}`}
        </span>
      </div>
      {editing ? (
        <FactEditor
          initial={fact.statement}
          saving={busy}
          onSave={(statement) => actions.save(fact, statement)}
          onCancel={() => {
            returnFocus.current = true;
            setEditing(false);
          }}
        />
      ) : null}
      {/*
       * На время правки текст и кнопки скрыты, а не удалены: кнопки библиотеки пересоздаются,
       * когда определяют тип устройства, и вернуть фокус на новый узел ненадёжно.
       */}
      <p id={statementId} className={styles.statement} hidden={editing}>
        {fact.statement}
      </p>
      <div className={styles.actions} hidden={editing}>
        {fact.status !== 'confirmed' ? (
          <Button
            view="secondary"
            size={32}
            loading={busy}
            aria-describedby={statementId}
            onClick={() => {
              actions.confirm(fact);
            }}
          >
            Подтвердить
          </Button>
        ) : null}
        <Button
          ref={editButton}
          view="transparent"
          size={32}
          disabled={busy}
          aria-describedby={statementId}
          onClick={() => {
            setEditing(true);
          }}
        >
          Исправить
        </Button>
        {fact.status !== 'rejected' ? (
          <Button
            view="transparent"
            size={32}
            disabled={busy}
            aria-describedby={statementId}
            onClick={() => {
              actions.reject(fact);
            }}
          >
            Отклонить
          </Button>
        ) : null}
      </div>
    </li>
  );
}
