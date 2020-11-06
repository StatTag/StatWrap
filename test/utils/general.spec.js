import GeneralUtil from '../../app/utils/general';

describe('services', () => {
  describe('GeneralUtil', () => {
    describe('formatDateTime', () => {
      it('returns an empty string for an empty date parameter', () => {
        expect(GeneralUtil.formatDateTime(null)).toBe('');
        expect(GeneralUtil.formatDateTime(undefined)).toBe('');
        expect(GeneralUtil.formatDateTime('')).toBe('');
      });

      it('correctly formats a Date parameter', () => {
        expect(GeneralUtil.formatDateTime(new Date(1604084623302))).toBe('2020-10-30 19:03:43'); // '2020-10-30T19:03:43.302Z'
      });

      it('correctly formats a string parameter', () => {
        expect(GeneralUtil.formatDateTime('2020-10-30T19:03:43.302Z')).toBe('2020-10-30 19:03:43');
      });

      it('returns the original string for an invalid string date', () => {
        expect(GeneralUtil.formatDateTime('Not even close')).toBe('Not even close');
      });
    });
  });
});
