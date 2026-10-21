import { useConfirmFacts, useUpdateFact } from '../../../api/hooks/companies';
import type { ProfileFact } from '../../../schemas/company';
import { pluralForms } from '../../../shared/labels';
import { pluralize } from '../../../shared/lib/plural';
import { useToast } from '../../../shared/ui/Toast/toastContext';

const FAILED = 'Не удалось сохранить. Попробуйте ещё раз';

/**
 * Действия с фактами профиля. «Отклонить» можно отменить из уведомления —
 * факт вернётся в прежний статус. Исправленная формулировка считается подтверждённой:
 * её написал сам пользователь.
 */
export function useFactActions(companyId: string) {
  const update = useUpdateFact(companyId);
  const confirmMany = useConfirmFacts(companyId);
  const showToast = useToast();

  const setStatus = (fact: ProfileFact, status: ProfileFact['status'], onSuccess: () => void) => {
    update.mutate(
      { factId: fact.id, body: { status } },
      {
        onSuccess,
        onError: () => {
          showToast({ title: FAILED });
        },
      },
    );
  };

  const confirm = (fact: ProfileFact) => {
    setStatus(fact, 'confirmed', () => {
      showToast({ title: 'Подтверждено' });
    });
  };

  const reject = (fact: ProfileFact) => {
    setStatus(fact, 'rejected', () => {
      showToast({
        title: 'Отклонено',
        action: {
          label: 'Отменить',
          onClick: () => {
            setStatus({ ...fact, status: 'rejected' }, fact.status, () => undefined);
          },
        },
      });
    });
  };

  /** Возвращает true, если сервер принял правку: тогда редактор можно закрыть. */
  const save = async (fact: ProfileFact, statement: string): Promise<boolean> => {
    try {
      await update.mutateAsync({ factId: fact.id, body: { statement, status: 'confirmed' } });
      showToast({ title: 'Сохранено' });
      return true;
    } catch {
      showToast({ title: FAILED });
      return false;
    }
  };

  const confirmAll = (facts: readonly ProfileFact[]) => {
    confirmMany.mutate(
      facts.map((fact) => fact.id),
      {
        onSuccess: (confirmed) => {
          showToast({ title: `Подтверждено: ${pluralize(confirmed.length, pluralForms.fact)}` });
        },
        onError: () => {
          showToast({ title: 'Подтвердить удалось не всё. Попробуйте ещё раз' });
        },
      },
    );
  };

  return {
    confirm,
    reject,
    save,
    confirmAll,
    /** Факт, по которому идёт запрос: его кнопки показывают загрузку и не нажимаются. */
    busyFactId: update.isPending ? update.variables.factId : null,
    isConfirmingAll: confirmMany.isPending,
  };
}

export type FactActions = ReturnType<typeof useFactActions>;
