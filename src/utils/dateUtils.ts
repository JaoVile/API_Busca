export function getTodayDateString(): string {
  return new Date().toISOString().split('T')[0]; // "2026-03-31"
}

export function getMonthRange(): { start: string; end: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);       // dia 01
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);     // último dia

  return {
    start: start.toISOString().split('T')[0], // "2026-03-01"
    end: end.toISOString().split('T')[0],     // "2026-03-31"
  };
}
