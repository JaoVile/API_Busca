import { getTodayDateString, getMonthRange } from '../../src/utils/dateUtils';

describe('dateUtils', () => {
  it('getTodayDateString returns YYYY-MM-DD', () => {
    expect(getTodayDateString()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  describe('getMonthRange (RN01)', () => {
    it('start is day 01', () => {
      expect(getMonthRange().start).toMatch(/-01$/);
    });

    it('end is day 28-31', () => {
      const day = parseInt(getMonthRange().end.split('-')[2]);
      expect(day).toBeGreaterThanOrEqual(28);
      expect(day).toBeLessThanOrEqual(31);
    });
  });
});
