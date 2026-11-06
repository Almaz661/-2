import { UtilityMeter, UtilityReading } from '../types';

/**
 * Пересчитывает всю цепочку показаний счётчика строго хронологически:
 * - Каждое показание сопоставляется с предшествующим (previousValue);
 * - Расход (difference) = Текущее - Предыдущее;
 * - Начисление (cost) = Расход × Тариф.
 */
export function recalculateMeterReadings(
  readings: UtilityReading[],
  tariffRate: number,
  initialValue: number
): UtilityReading[] {
  if (!readings || readings.length === 0) return [];

  // Сортировка по дате (YYYY-MM-DD), затем по ID для стабильности
  const sorted = [...readings].sort((a, b) => {
    const cmp = a.date.localeCompare(b.date);
    if (cmp !== 0) return cmp;
    return a.id.localeCompare(b.id);
  });

  return sorted.map((reading, idx) => {
    const prevValue = idx > 0 ? sorted[idx - 1].value : initialValue;
    // Разница не может быть отрицательной при обычном прямом счётчике
    const difference = Math.max(0, Math.round((reading.value - prevValue) * 1000) / 1000);
    const cost = Math.round(difference * tariffRate * 100) / 100;

    return {
      ...reading,
      previousValue: prevValue,
      difference,
      cost,
    };
  });
}

/**
 * Находит предыдущее показание счётчика перед указанной датой или месяцем
 */
export function getPreviousReadingForMeter(
  meter: UtilityMeter,
  targetDateOrMonth: string
): { previousValue: number; previousReading: UtilityReading | null } {
  const sorted = [...meter.readings].sort((a, b) => a.date.localeCompare(b.date));

  // Ищем все записи, которые строго предшествуют переданной дате или месяцу
  const isMonth = targetDateOrMonth.length === 7; // 'YYYY-MM'
  const prior = sorted.filter((r) => {
    if (isMonth) {
      return r.month < targetDateOrMonth;
    }
    return r.date < targetDateOrMonth;
  });

  if (prior.length > 0) {
    const lastPrior = prior[prior.length - 1];
    return {
      previousValue: lastPrior.value,
      previousReading: lastPrior,
    };
  }

  return {
    previousValue: meter.initialValue,
    previousReading: null,
  };
}
