import { type QualityMetrics, qualityMetricsSchema } from '../../schemas/quality';
import { request } from '../http';

export function fetchQualityMetrics(signal?: AbortSignal): Promise<QualityMetrics> {
  return request('/api/metrics/quality', qualityMetricsSchema, { signal });
}
