/* eslint-disable prettier/prettier */
import GeneralUtil from '../../app/utils/general';

describe('utils', () => {
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

    describe('formatName', () => {
      it('returns a displayable string for an empty object', () => {
        expect(GeneralUtil.formatName(null)).toBe('(empty)');
        expect(GeneralUtil.formatName(undefined)).toBe('(empty)');
        expect(GeneralUtil.formatName({})).toBe('(empty)');
      });

      it('returns a displayable string when first and last are not specified', () => {
        expect(GeneralUtil.formatName({ first: null, last: null })).toBe('(empty)');
        expect(GeneralUtil.formatName({ first: undefined, last: undefined })).toBe('(empty)');
        expect(GeneralUtil.formatName({ first: '', last: '' })).toBe('(empty)');
      });

      it('returns the provided component when first or last are not specified', () => {
        expect(GeneralUtil.formatName({ first: 'Test', last: null })).toBe('Test');
        expect(GeneralUtil.formatName({ first: undefined, last: 'Test' })).toBe('Test');
        expect(GeneralUtil.formatName({ first: 'Test', last: '' })).toBe('Test');
      });

      it('trims blank spaces in first and last name and considers it empty', () => {
        expect(GeneralUtil.formatName({ first: ' ', last: ' ' })).toBe('(empty)');
      });

      it('formats all provided componenents', () => {
        expect(
          GeneralUtil.formatName({
            first: 'Test',
            last: 'Person',
          }),
        ).toBe('Test Person');
      });

      it('formats around missing componenents', () => {
        expect(GeneralUtil.formatName({ last: 'Person' })).toBe('Person');
        expect(GeneralUtil.formatName({ first: 'Test' })).toBe('Test');
      });
    });

    describe('formatDisplayName', () => {
      it('returns a displayable string for an empty object', () => {
        expect(GeneralUtil.formatDisplayName(null)).toBe('(empty)');
        expect(GeneralUtil.formatDisplayName(undefined)).toBe('(empty)');
        expect(GeneralUtil.formatDisplayName({})).toBe('(empty)');
      });

      it('returns the username/id if no name element exists', () => {
        expect(
          GeneralUtil.formatDisplayName({
            id: 'test',
          }),
        ).toBe('test');
      });
      it('formats the name from components if no display name exists', () => {
        expect(
          GeneralUtil.formatDisplayName({
            id: 'test',
            name: {
              first: 'Test',
              last: 'Person',
            },
          }),
        ).toBe('Test Person');
      });
      it('formats the name from components if the display name is empty', () => {
        expect(
          GeneralUtil.formatDisplayName({
            id: 'test',
            name: {
              first: 'Test',
              last: 'Person',
              display: ' ',
            },
          }),
        ).toBe('Test Person');
      });
      it('returns the username/id if all name components result in an empty string', () => {
        expect(
          GeneralUtil.formatDisplayName({
            id: 'test',
            name: {
              first: '',
              last: ' ',
              display: ' ',
            },
          }),
        ).toBe('test');
      });
      it('returns the display name by default when all other items exist', () => {
        expect(
          GeneralUtil.formatDisplayName({
            id: 'test',
            name: {
              first: 'Test',
              last: 'User',
              display: 'Display Name',
            },
          }),
        ).toBe('Display Name');
      });
    });

    describe('toggleStringInArray', () => {
      it('handles a null or undefined input array', () => {
        expect(GeneralUtil.toggleStringInArray(null, 'test', true)).toBe(null);
        expect(GeneralUtil.toggleStringInArray(undefined, 'test', true)).toBe(undefined);
      });
      it('ignores null or undefined items', () => {
        expect(GeneralUtil.toggleStringInArray([], null, true)).toStrictEqual([]);
        expect(GeneralUtil.toggleStringInArray([], undefined, true)).toStrictEqual([]);
      });
      it('adds an item to the array when included', () => {
        expect(GeneralUtil.toggleStringInArray([], 'test', true)).toStrictEqual(['test']);
        expect(GeneralUtil.toggleStringInArray(['test'], 'test2', true)).toStrictEqual([
          'test',
          'test2',
        ]);
      });
      it('does not add a duplicate item to the array when included', () => {
        expect(GeneralUtil.toggleStringInArray(['test'], 'test', true)).toStrictEqual(['test']);
        expect(GeneralUtil.toggleStringInArray(['test', 'test2'], 'test2', true)).toStrictEqual([
          'test',
          'test2',
        ]);
      });
      it('removes an item from the array when excluded', () => {
        expect(GeneralUtil.toggleStringInArray(['test'], 'test', false)).toStrictEqual([]);
      });
      it('does not remove a non-existant item from the array when excluded', () => {
        expect(GeneralUtil.toggleStringInArray(['test'], 'test2', false)).toStrictEqual(['test']);
      });
    });

    describe('indexByField', () => {
      it('handles a null or undefined input array', () => {
        expect(GeneralUtil.indexByField(null, 'test')).toBe(null);
        expect(GeneralUtil.indexByField(undefined, 'test')).toBe(null);
      });
      it('handles a null or undefined field name', () => {
        expect(GeneralUtil.indexByField([], null)).toStrictEqual([]);
        expect(GeneralUtil.indexByField([], undefined)).toStrictEqual([]);
      });
      it('returns an empty array when given an empty array', () => {
        expect(GeneralUtil.indexByField([], 'test')).toStrictEqual([]);
      });
      it('processes an array where the index field is a single value', () => {
        const inputArray = [
          { category: '1', value: 'a' },
          { category: '1', value: 'b' },
        ];
        expect(GeneralUtil.indexByField(inputArray, 'category')).toStrictEqual({ '1': inputArray });
      });
      it('processes an array where the index field does not exist', () => {
        const inputArray = [
          { category: '1', value: 'a' },
          { category: '1', value: 'b' },
        ];
        expect(GeneralUtil.indexByField(inputArray, 'category2')).toStrictEqual({
          undefined: inputArray,
        });
      });
      it('processes an array where the index field can contain multiple values (array)', () => {
        const inputArray = [
          { category: ['1'], value: 'a' },
          { category: ['1', '2'], value: 'b' },
        ];
        expect(GeneralUtil.indexByField(inputArray, 'category')).toStrictEqual({
          '1': [
            { category: ['1'], value: 'a' },
            { category: ['1', '2'], value: 'b' },
          ],
          '2': [{ category: ['1', '2'], value: 'b' }],
        });
      });
    });
  });
});
