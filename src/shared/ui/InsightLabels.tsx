import type { Insight } from '../../schemas/insight';
import { insightKindLabels, urgencyLabels } from '../labels';
import { Badge, type BadgeTone } from './Badge/Badge';

type LabeledInsight = Pick<Insight, 'kind' | 'urgency'>;

/**
 * Цвета по правилам продукта: зелёный — только возможности, красный — только срочный риск.
 * Цвет никогда не единственный носитель смысла: рядом всегда текст.
 */
function urgencyTone(insight: LabeledInsight): BadgeTone {
  if (insight.urgency === 'urgent') {
    return insight.kind === 'risk' ? 'negative' : 'strong';
  }
  return insight.urgency === 'important' ? 'neutral' : 'quiet';
}

export function InsightLabels({ insight }: { insight: LabeledInsight }) {
  return (
    <>
      <Badge tone={insight.kind === 'opportunity' ? 'positive' : 'neutral'}>
        {insightKindLabels[insight.kind]}
      </Badge>
      <Badge tone={urgencyTone(insight)}>{urgencyLabels[insight.urgency]}</Badge>
    </>
  );
}
