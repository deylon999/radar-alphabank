import { Checkbox } from '@alfalab/core-components/checkbox/modern';
import { Radio } from '@alfalab/core-components/radio/modern';

import { INSIGHT_KINDS } from '../../../schemas/insight';
import { DIGEST_FREQUENCIES, type NotificationSettings } from '../../../schemas/notifications';
import { digestFrequencyLabels, insightKindPluralLabels, terms } from '../../../shared/labels';
import { NativeSelectField } from '../../../shared/ui/NativeSelectField/NativeSelectField';
import { SettingsSection } from '../SettingsSection';
import { useUpdateSettings } from '../useUpdateSettings';
import { digestTimeOptions } from './digestTimes';
import styles from './RulesForm.module.css';

/** Правила: что присылать срочно, как часто и когда присылать сводку. Сохраняется сразу. */
export function RulesForm({ settings }: { settings: NotificationSettings }) {
  const update = useUpdateSettings();
  const telegramHint = settings.telegram.connected ? null : (
    <>Пока Telegram не подключён, уведомления приходить не будут&nbsp;— правила сохранятся.</>
  );

  return (
    <>
      <SettingsSection title={terms.urgentRules} description={telegramHint}>
        <fieldset className={styles.fieldset}>
          <legend className={styles.legend}>Присылать сразу</legend>
          {INSIGHT_KINDS.map((kind) => (
            <Checkbox
              key={kind}
              size={24}
              label={insightKindPluralLabels[kind]}
              checked={settings.urgentKinds.includes(kind)}
              onChange={(_, { checked }) => {
                const urgentKinds = INSIGHT_KINDS.filter((item) =>
                  item === kind ? checked : settings.urgentKinds.includes(item),
                );
                update({ ...settings, urgentKinds });
              }}
            />
          ))}
        </fieldset>
      </SettingsSection>
      <SettingsSection
        title={terms.digest}
        description="Короткий обзор новых рисков и возможностей."
      >
        <fieldset className={styles.fieldset}>
          <legend className={styles.legend}>Как часто</legend>
          {DIGEST_FREQUENCIES.map((digest) => (
            <Radio
              key={digest}
              size={24}
              name="digest"
              value={digest}
              label={digestFrequencyLabels[digest]}
              checked={settings.digest === digest}
              onChange={() => {
                update({ ...settings, digest });
              }}
            />
          ))}
        </fieldset>
        <NativeSelectField
          className={styles.time}
          label="Время сводки"
          size={48}
          value={settings.digestTime}
          disabled={settings.digest === 'off'}
          options={digestTimeOptions(settings.digestTime).map((time) => ({
            value: time,
            label: time,
          }))}
          onChange={(digestTime) => {
            update({ ...settings, digestTime });
          }}
        />
      </SettingsSection>
    </>
  );
}
