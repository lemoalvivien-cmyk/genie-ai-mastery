const TZ = Intl.DateTimeFormat().resolvedOptions().timeZone;

export function getLocalDate(): string {
  return new Intl.DateTimeFormat("fr-CA", { timeZone: TZ }).format(new Date());
}

export function getLocalYesterday(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return new Intl.DateTimeFormat("fr-CA", { timeZone: TZ }).format(d);
}

export function getLocalDateMinusDays(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return new Intl.DateTimeFormat("fr-CA", { timeZone: TZ }).format(d);
}
