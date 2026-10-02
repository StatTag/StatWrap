import { filterContentsByPaths, collectAllPaths } from '../../app/utils/templateContent';

const sampleContents = [
  {
    type: 'directory',
    name: 'Chapter 1',
    path: '/chapter-1',
    contents: [
      { type: 'file', name: 'outline.md', path: '/chapter-1/outline.md' },
      {
        type: 'directory',
        name: 'data',
        path: '/chapter-1/data',
        contents: [
          { type: 'file', name: 'sample.csv', path: '/chapter-1/data/sample.csv' },
        ],
      },
    ],
  },
  { type: 'file', name: 'README.md', path: '/README.md' },
];

describe('utils', () => {
  describe('templateContent', () => {
    describe('collectAllPaths', () => {
      it('should return all paths recursively', () => {
        const paths = collectAllPaths(sampleContents);
        expect(paths).toEqual([
          '/chapter-1',
          '/chapter-1/outline.md',
          '/chapter-1/data',
          '/chapter-1/data/sample.csv',
          '/README.md',
        ]);
      });

      it('should return an empty array for null input', () => {
        expect(collectAllPaths(null)).toEqual([]);
      });

      it('should return an empty array for undefined input', () => {
        expect(collectAllPaths(undefined)).toEqual([]);
      });

      it('should return an empty array for empty contents', () => {
        expect(collectAllPaths([])).toEqual([]);
      });
    });

    describe('filterContentsByPaths', () => {
      it('should return all items when all paths are checked', () => {
        const allPaths = collectAllPaths(sampleContents);
        const result = filterContentsByPaths(sampleContents, allPaths);
        expect(result).toEqual(sampleContents);
      });

      it('should return an empty array when no paths are checked', () => {
        const result = filterContentsByPaths(sampleContents, []);
        expect(result).toEqual([]);
      });

      it('should return an empty array for null contents', () => {
        expect(filterContentsByPaths(null, ['/foo'])).toEqual([]);
      });

      it('should keep only selected files', () => {
        const result = filterContentsByPaths(sampleContents, ['/README.md']);
        expect(result.length).toBe(1);
        expect(result[0].name).toBe('README.md');
      });

      it('should keep a folder and filter its children', () => {
        const result = filterContentsByPaths(sampleContents, [
          '/chapter-1',
          '/chapter-1/data',
          '/chapter-1/data/sample.csv',
        ]);
        expect(result.length).toBe(1);
        expect(result[0].name).toBe('Chapter 1');
        // outline.md was not in checkedPaths, so it should be excluded
        expect(result[0].contents.length).toBe(1);
        expect(result[0].contents[0].name).toBe('data');
      });

      it('should exclude a folder if it is not in checkedPaths', () => {
        const result = filterContentsByPaths(sampleContents, ['/README.md']);
        expect(result.find((i) => i.name === 'Chapter 1')).toBeUndefined();
      });
    });
  });
});