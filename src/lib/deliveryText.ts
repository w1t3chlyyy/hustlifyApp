export type DeliveryUnit = 'hours' | 'days';

function pluralRu(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
  return many;
}

export function deliveryUnitLabel(n: number, unit: DeliveryUnit): string {
  return unit === 'hours'
    ? pluralRu(n, 'час', 'часа', 'часов')
    : pluralRu(n, 'день', 'дня', 'дней');
}

/** "от 1 до 24 часов" / "3 дня" (when min === max) */
export function deliveryRangeText(min: number, max: number, unit: DeliveryUnit): string {
  if (min >= max) return `${max} ${deliveryUnitLabel(max, unit)}`;
  return `от ${min} до ${max} ${deliveryUnitLabel(max, unit)}`;
}
