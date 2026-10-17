import type { Insight } from '../../../schemas/insight';
import { insightKindLabels, urgencyLabels } from '../../../shared/labels';
import { Badge, type BadgeTone } from '../../../shared/ui/Badge/Badge';

/**
 * Цвета по правилам продукта: зелёный — только возможности, красный — только срочный риск.
 * Цвет никогда не единственный носитель смысла: рядом всегда текст.
 */
function urgencyTone(insight: Insight): BadgeTone {
  if (insight.urgency === 'urgent') {
    return insight.kind === 'risk' ? 'negative' : 'strong';
  }
  return insight.urgency === 'important' ? 'neutral' : 'quiet';
}

export function InsightLabels({ insight }: { insight: Insight }) {
  return (
    <>
      <Badge tone={insight.kind === 'opportunity' ? 'positive' : 'neutral'}>
        {insightKindLabels[insight.kind]}
      </Badge>
      <Badge tone={urgencyTone(insight)}>{urgencyLabels[insight.urgency]}</Badge>
    </>
  );
}
