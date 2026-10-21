import { useCompany } from '../../api/hooks/companies';
import type { Company, ProfileFact } from '../../schemas/company';
import { pluralForms, terms } from '../../shared/labels';
import { pluralize } from '../../shared/lib/plural';
import { QueryView } from '../../shared/ui/QueryView';
import { PageSkeleton } from '../../shared/ui/Skeleton/PageSkeleton';
import { useToast } from '../../shared/ui/Toast/toastContext';
import styles from './CompanyProfile.module.css';
import { BankData } from './BankData/BankData';
import { CompanySummary } from './CompanySummary';
import { DescribeForm } from './DescribeForm/DescribeForm';
import { FactList } from './FactList/FactList';
import { useFactActions } from './FactList/useFactActions';
import { PendingBanner } from './PendingBanner/PendingBanner';
import { ProfileIntro } from './ProfileIntro/ProfileIntro';
import { RoleField } from './RoleField/RoleField';

function ProfileContent({ company }: { company: Company }) {
  const actions = useFactActions(company.id);
  const showToast = useToast();
  const pending = company.facts.filter((fact) => fact.status === 'pending');
  const isEmpty = company.facts.length === 0;

  const announceFacts = (facts: ProfileFact[]) => {
    showToast({
      title:
        facts.length > 0
          ? `Добавлено: ${pluralize(facts.length, pluralForms.fact)}. Проверьте и подтвердите`
          : 'Новых фактов не нашли. Добавьте подробностей',
    });
  };

  return (
    <div className={styles.layout}>
      <div className={styles.main}>
        <div className={styles.summary}>
          <CompanySummary company={company} />
        </div>
        {company.profile ? (
          <div className={styles.bankData}>
            <BankData profile={company.profile} />
          </div>
        ) : null}
        {isEmpty ? null : (
          <div className={styles.banner}>
            <PendingBanner
              count={pending.length}
              confirming={actions.isConfirmingAll}
              onConfirmAll={() => {
                actions.confirmAll(pending);
              }}
            />
          </div>
        )}
        <section aria-labelledby="profile-facts-title" className={styles.facts}>
          <h2 id="profile-facts-title" className={styles.title}>
            {terms.profileFacts}
          </h2>
          {isEmpty ? (
            <p className={styles.muted}>
              Фактов пока нет. Опишите компанию&nbsp;— система выделит факты и попросит их
              подтвердить.
            </p>
          ) : (
            <FactList facts={company.facts} actions={actions} />
          )}
        </section>
      </div>
      <div className={styles.aside}>
        <div className={styles.role}>
          <RoleField />
        </div>
        {isEmpty ? (
          <div className={styles.promo}>
            <ProfileIntro />
          </div>
        ) : null}
        <div className={styles.form}>
          <DescribeForm companyId={company.id} onDone={announceFacts} />
        </div>
      </div>
    </div>
  );
}

/**
 * Профиль компании: шапка, данные банка, роль пользователя, подтверждение изменений, факты
 * и форма «Расскажите о компании».
 */
export function CompanyProfile({ companyId }: { companyId: string }) {
  const query = useCompany(companyId);
  return (
    <QueryView
      query={query}
      skeleton={<PageSkeleton blocks={3} />}
      errorTitle="Не удалось загрузить профиль компании"
    >
      {/* key: при смене компании состояние формы и редакторов не переезжает к другой. */}
      {(company) => <ProfileContent key={company.id} company={company} />}
    </QueryView>
  );
}
