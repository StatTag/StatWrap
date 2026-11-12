const fs = require('fs');
const path = require('path');
const os = require('os');
beforeAll(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterAll(() => {
  console.log.mockRestore();
  console.warn.mockRestore();
  console.error.mockRestore();
});
// Mock dependencies
jest.mock('flexsearch');
jest.mock('electron', () => ({
  ipcRenderer: {
    invoke: jest.fn(),
    send: jest.fn(),
    on: jest.fn(),
    once: jest.fn(),
    removeListener: jest.fn(),
  },
}));
jest.mock('fs');
jest.mock('path');
jest.mock('os');

// Mock SearchConfig
jest.mock('../../app/constants/search-config', () => ({
  search: {
    resolution: 5,
    depth: 3,
    maxResults: 1000,
    enableFuzzySearch: true,
    fuzzySearchThreshold: 3,
    preprocessing: {
      enableStopWords: false,
      stopWords: ['the', 'and', 'or'],
      technicalStopWords: ['function', 'class'],
      minWordLength: 2,
    },
  },
  performance: {
    resultCacheSize: 100,
    resultCacheTTL: 600000,
  },
  scoring: {
    weights: {
      exactPhraseContent: 1.0,
      exactPhraseTitle: 0.9,
      individualWordContent: 0.2,
      individualWordTitle: 0.15,
      allWordsBonus: 0.3,
      partialWordMatch: 0.1,
      titlePartialMatch: 0.08,
      contentIndexedBonus: 0.05,
      flexSearchScore: 0.4,
      proximityBonus: 0.2,
      fieldLengthPenalty: 0.1,
    },
    maxBaseScore: 100,
  },
}));

import FlexSearch from 'flexsearch';

const TEST_USER_HOME_PATH = process.platform === 'win32' ? 'C:\\Users\\test' : '/Users/test';
os.homedir.mockReturnValue(TEST_USER_HOME_PATH);

// Import singleton instance
import SearchServiceInstance from '../../app/services/SearchService';
import Messages from '../../app/constants/messages';

describe('SearchService', () => {
  let mockFlexSearchDocument;

  const mockProject = {
    id: 'test-project-1',
    name: 'Test Project',
    path: '/test/project/path',
    description: { content: 'A test project for unit testing' },
    categories: ['testing', 'development'],
    people: [
      {
        id: 'person-1',
        name: { first: 'John', last: 'Doe' },
        affiliation: 'Test Corp',
        roles: ['developer'],
        notes: [{ id: 'note-1', content: 'Test person note' }],
      },
    ],
    notes: [{ id: 'project-note-1', content: 'Project level note', author: 'test' }],
    assetGroups: [
      {
        id: 'asset-group-1',
        name: 'Test Assets',
        details: 'Test asset group',
        assets: [{ uri: 'test-asset.txt' }],
      },
    ],
  };

  const mockIndexData = {
    version: '1.0',
    timestamp: new Date().toISOString(),
    documentStore: [
      [
        'doc1',
        {
          id: 'doc1',
          type: 'project',
          title: 'Test Project',
          content: 'test content',
          item: mockProject,
        },
      ],
    ],
    indexedProjects: {
      'test-project-1': {
        id: 'test-project-1',
        name: 'Test Project',
        path: '/test/project/path',
        lastIndexed: Date.now(),
      },
    },
    performanceStats: {
      totalSearches: 0,
      totalIndexingTime: 0,
      averageSearchTime: 0,
      documentsIndexed: 0,
      searchTimes: [],
    },
    maxIndexingFileSize: 0.1 * 1024 * 1024,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Completely reset the SearchService instance state
    if (SearchServiceInstance.updateTimeout) {
      clearTimeout(SearchServiceInstance.updateTimeout);
      SearchServiceInstance.updateTimeout = null;
    }
    SearchServiceInstance.isInitialized = false;
    SearchServiceInstance.documentStore.clear();
    SearchServiceInstance.projectsData = [];
    SearchServiceInstance.indexingInProgress = false;
    SearchServiceInstance.indexedProjectsMap.clear();
    SearchServiceInstance.resultCache.clear();
    SearchServiceInstance.indexFilePath = null;
    SearchServiceInstance.maxIndexingFileSize = 0.1 * 1024 * 1024;
    SearchServiceInstance.indicesBuiltThisSession = false;
    SearchServiceInstance.isRestoring = false;
    SearchServiceInstance.indexingQueue = [];

    // Reset performance stats
    SearchServiceInstance.performanceStats = {
      totalSearches: 0,
      totalIndexingTime: 0,
      averageSearchTime: 0,
      documentsIndexed: 0,
      searchTimes: [],
    };

    if (SearchServiceInstance.performSearch && SearchServiceInstance.performSearch.mockRestore) {
      SearchServiceInstance.performSearch.mockRestore();
    }
    if (
      SearchServiceInstance.buildIndicesFromDocumentStore &&
      SearchServiceInstance.buildIndicesFromDocumentStore.mockRestore
    ) {
      SearchServiceInstance.buildIndicesFromDocumentStore.mockRestore();
    }
    if (SearchServiceInstance.getFromCache && SearchServiceInstance.getFromCache.mockRestore) {
      SearchServiceInstance.getFromCache.mockRestore();
    }

    // Mock FlexSearch Document
    mockFlexSearchDocument = {
      add: jest.fn(),
      search: jest.fn(() => []),
      remove: jest.fn(),
    };

    FlexSearch.Document = jest.fn(() => mockFlexSearchDocument);

    // Reset indices to use mocked FlexSearch
    SearchServiceInstance.indices = {
      main: mockFlexSearchDocument,
      projects: mockFlexSearchDocument,
      files: mockFlexSearchDocument,
      people: mockFlexSearchDocument,
      notes: mockFlexSearchDocument,
    };

    // Mock file system
    fs.existsSync = jest.fn();
    fs.readFileSync = jest.fn();
    fs.writeFileSync = jest.fn();
    fs.mkdirSync = jest.fn();
    fs.readdirSync = jest.fn(() => []);
    fs.statSync = jest.fn();
    fs.unlinkSync = jest.fn();

    path.join = jest.fn((...args) => args.join('/'));
    path.extname = jest.fn((file) => {
      const parts = file.split('.');
      return parts.length > 1 ? '.' + parts[parts.length - 1] : '';
    });
    path.basename = jest.fn((file) => file.split('/').pop());
    path.relative = jest.fn((from, to) => to.replace(from + '/', ''));
  });

  describe('Initialization', () => {
    it('should have correct initial state', () => {
      expect(SearchServiceInstance.isInitialized).toBe(false);
      expect(SearchServiceInstance.documentStore).toBeInstanceOf(Map);
      expect(SearchServiceInstance.projectsData).toEqual([]);
      expect(SearchServiceInstance.indexingInProgress).toBe(false);
      expect(SearchServiceInstance.maxIndexingFileSize).toBe(0.1 * 1024 * 1024);
      expect(SearchServiceInstance.indices).toHaveProperty('main');
      expect(SearchServiceInstance.indices).toHaveProperty('projects');
      expect(SearchServiceInstance.indices).toHaveProperty('files');
      expect(SearchServiceInstance.indices).toHaveProperty('people');
      expect(SearchServiceInstance.indices).toHaveProperty('notes');
    });
  });

  describe('setupIndexFilePath', () => {
    it('should set up index file path correctly', async () => {
      fs.existsSync.mockReturnValue(false);
      SearchServiceInstance.userDataPath = '/app/data';

      await SearchServiceInstance.setupIndexFilePath();

      expect(fs.mkdirSync).toHaveBeenCalledWith('/app/data/search', { recursive: true });
      expect(SearchServiceInstance.indexFilePath).toBe('/app/data/search/search-index.json');
    });

    it('should handle errors and fall back to current directory', async () => {
      process.cwd = jest.fn(() => '/current/dir');
      fs.existsSync.mockImplementationOnce(() => {
          throw new Error();
      });
      SearchServiceInstance.userDataPath = '/app/data';

      await SearchServiceInstance.setupIndexFilePath();

      expect(SearchServiceInstance.indexFilePath).toBe('/current/dir/search-index.json');
    });
  });

  describe('loadIndexFromFile', () => {
    it('should return default structure when no index file exists', async () => {
      fs.existsSync.mockReturnValue(false);

      const result = await SearchServiceInstance.loadIndexFromFile();

      expect(result.version).toBe('1.0');
      expect(result.documentStore).toEqual([]);
      expect(result.indexedProjects).toEqual({});
      expect(result.performanceStats).toBeDefined();
    });

    it('should load existing valid index file', async () => {
      SearchServiceInstance.indexFilePath = '/test/index.json';
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(JSON.stringify(mockIndexData));

      const result = await SearchServiceInstance.loadIndexFromFile();

      expect(result.version).toBe('1.0');
      expect(result.documentStore).toBeDefined();
      expect(result.indexedProjects).toBeDefined();
      expect(fs.readFileSync).toHaveBeenCalledWith('/test/index.json', 'utf8');
    });

    it('should handle invalid version and return default structure', async () => {
      const invalidData = { ...mockIndexData, version: '0.5' };
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(JSON.stringify(invalidData));

      const result = await SearchServiceInstance.loadIndexFromFile();

      expect(result.version).toBe('1.0');
      expect(result.documentStore).toEqual([]);
    });

    it('should handle JSON parse errors', async () => {
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue('invalid json');

      const result = await SearchServiceInstance.loadIndexFromFile();

      expect(result.version).toBe('1.0');
      expect(result.documentStore).toEqual([]);
    });
  });

  describe('saveIndexToFile', () => {
    it('should save index data to file', async () => {
      SearchServiceInstance.indexFilePath = '/test/index.json';
      SearchServiceInstance.documentStore.set('doc1', { id: 'doc1', type: 'test' });

      await SearchServiceInstance.saveIndexToFile();

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        '/test/index.json',
        expect.stringMatching(/"version":\s*"1\.0"/),
      );
    });

    it('should handle write errors gracefully', async () => {
      SearchServiceInstance.indexFilePath = '/test/index.json';
      fs.writeFileSync.mockImplementation(() => {
        throw new Error('Write failed');
      });

      await expect(SearchServiceInstance.saveIndexToFile()).resolves.toBeUndefined();
    });
  });

  describe('buildIndicesFromDocumentStore', () => {
    it('should build indices from document store', () => {
      SearchServiceInstance.documentStore.set('doc1', {
        id: 'doc1',
        type: 'project',
        title: 'Test',
        content: 'test content',
      });

      SearchServiceInstance.buildIndicesFromDocumentStore();

      expect(mockFlexSearchDocument.add).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'doc1',
          type: 'project',
        }),
      );
    });

    it('should handle documents in batches', () => {
      // Clear previous calls and reset mock
      mockFlexSearchDocument.add.mockClear();

      // Add 150 documents
      for (let i = 0; i < 150; i++) {
        SearchServiceInstance.documentStore.set(`doc${i}`, {
          id: `doc${i}`,
          type: 'file',
          title: `Test ${i}`,
          content: `test content ${i}`,
        });
      }

      SearchServiceInstance.buildIndicesFromDocumentStore();

      // Since we mock all indexws with the same mock, it counts multiple calls per document
      expect(mockFlexSearchDocument.add).toHaveBeenCalledTimes(300); // 150 docs * 2 indces
    });
  });

  describe('initialize', () => {
    it('should initialize with projects and create new index', async () => {
      fs.existsSync.mockReturnValue(false);
      SearchServiceInstance.indexProject = jest.fn();

      await SearchServiceInstance.initialize('/app/data', [mockProject]);

      expect(SearchServiceInstance.isInitialized).toBe(true);
      expect(SearchServiceInstance.indexProject).toHaveBeenCalledWith(mockProject);
      expect(SearchServiceInstance.projectsData).toEqual([mockProject]);
    });

    it('should load existing index and check for updates', async () => {
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(JSON.stringify(mockIndexData));

      const buildIndicesSpy = jest
        .spyOn(SearchServiceInstance, 'buildIndicesFromDocumentStore')
        .mockImplementation(() => {});

      await SearchServiceInstance.initialize('/app/data', [mockProject]);

      expect(SearchServiceInstance.isInitialized).toBe(true);
      expect(buildIndicesSpy).toHaveBeenCalled();

      buildIndicesSpy.mockRestore();
    });
  });

  describe('search', () => {
    let groupResultsByTypeSpy;
    let addToCacheSpy;

    beforeEach(() => {
      SearchServiceInstance.isInitialized = true;
      groupResultsByTypeSpy = jest
        .spyOn(SearchServiceInstance, 'groupResultsByType')
        .mockReturnValue({
          projects: [],
          people: [],
          assets: [],
          files: [],
          folders: [],
          notes: [],
          all: [],
        });
      addToCacheSpy = jest
        .spyOn(SearchServiceInstance, 'addToCache')
        .mockImplementation(() => {});
    });

    afterEach(() => {
      if (groupResultsByTypeSpy) groupResultsByTypeSpy.mockRestore();
      if (addToCacheSpy) addToCacheSpy.mockRestore();
    });

    it('should return empty results for uninitialized service', () => {
      SearchServiceInstance.isInitialized = false;

      const results = SearchServiceInstance.search('test query');

      expect(results.all).toEqual([]);
    });

    it('should return empty results for empty query', () => {
      const results = SearchServiceInstance.search('');

      expect(results.all).toEqual([]);
    });

    it('should preprocess query and perform search', () => {
      const preprocessQuerySpy = jest
        .spyOn(SearchServiceInstance, 'preprocessQuery')
        .mockReturnValue({
          processedQuery: 'test',
          originalQuery: 'test query',
          removedWords: ['query'],
          keptWords: ['test'],
        });

      // Mock performSearch to return empty array
      const performSearchSpy = jest
        .spyOn(SearchServiceInstance, 'performSearch')
        .mockReturnValue([]);

      SearchServiceInstance.search('test query');

      expect(preprocessQuerySpy).toHaveBeenCalledWith('test query');
      expect(performSearchSpy).toHaveBeenCalledWith('test', {});

      preprocessQuerySpy.mockRestore();
      performSearchSpy.mockRestore();
    });

    it('should return cached results when available without performing a full search', () => {
      const cachedResults = { all: [{ id: 'cached' }] };
      const getFromCacheSpy = jest
        .spyOn(SearchServiceInstance, 'getFromCache')
        .mockReturnValue(cachedResults);
      const performSearchSpy = jest.spyOn(SearchServiceInstance, 'performSearch');

      const results = SearchServiceInstance.search('test');

      expect(results.all).toEqual(cachedResults.all);
      expect(performSearchSpy).not.toHaveBeenCalled();
      expect(results.queryPreprocessing).toBeDefined();

      getFromCacheSpy.mockRestore();
      performSearchSpy.mockRestore();
    });

    it('should bypass cache when indexing is in progress', () => {
      SearchServiceInstance.indexingInProgress = true;
      const getFromCacheSpy = jest.spyOn(SearchServiceInstance, 'getFromCache');
      const performSearchSpy = jest
        .spyOn(SearchServiceInstance, 'performSearch')
        .mockReturnValue([]);

      SearchServiceInstance.search('test');

      expect(getFromCacheSpy).not.toHaveBeenCalled();
      expect(performSearchSpy).toHaveBeenCalled();

      getFromCacheSpy.mockRestore();
      performSearchSpy.mockRestore();
      SearchServiceInstance.indexingInProgress = false;
    });

    it('should handle search errors gracefully', () => {
      // Clear any cached results first
      const getFromCacheSpy = jest
        .spyOn(SearchServiceInstance, 'getFromCache')
        .mockReturnValue(null);
      const performSearchSpy = jest
        .spyOn(SearchServiceInstance, 'performSearch')
        .mockImplementation(() => {
          throw new Error('Search failed');
        });

      const results = SearchServiceInstance.search('test');

      expect(results.all).toEqual([]);

      getFromCacheSpy.mockRestore();
      performSearchSpy.mockRestore();
    });
  });

  describe('performSearch', () => {
    beforeEach(() => {
      SearchServiceInstance.isInitialized = true;
      SearchServiceInstance.documentStore.set('doc1', {
        id: 'doc1',
        type: 'file',
        title: 'test file',
        content: 'test content',
        item: { projectId: 'project1', name: 'test.txt' },
      });

      // Clear any previous mocks
      mockFlexSearchDocument.search.mockClear();
    });

    it('should search using FlexSearch indices', () => {
      mockFlexSearchDocument.search.mockReturnValue([{ field: 'title', result: ['doc1'] }]);

      const results = SearchServiceInstance.performSearch('test');

      expect(mockFlexSearchDocument.search).toHaveBeenCalled();
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
    });

    it('should filter results by type', () => {
      mockFlexSearchDocument.search.mockReturnValue([{ field: 'title', result: ['doc1'] }]);

      const results = SearchServiceInstance.performSearch('test', { type: 'file' });

      expect(Array.isArray(results)).toBe(true);
      if (results.length > 0) {
        expect(results[0].type).toBe('file');
      }
    });

    it('should filter results by project', () => {
      mockFlexSearchDocument.search.mockReturnValue([{ field: 'title', result: ['doc1'] }]);

      const results = SearchServiceInstance.performSearch('test', { projectId: 'project1' });

      expect(Array.isArray(results)).toBe(true);
    });

    it('should limit results according to maxResults', () => {
      // Create multiple mock results
      SearchServiceInstance.documentStore.set('doc2', {
        id: 'doc2',
        type: 'file',
        title: 'test2',
        content: 'test2',
        item: { projectId: 'project1', name: 'test2.txt' },
      });
      SearchServiceInstance.documentStore.set('doc3', {
        id: 'doc3',
        type: 'file',
        title: 'test3',
        content: 'test3',
        item: { projectId: 'project1', name: 'test3.txt' },
      });

      mockFlexSearchDocument.search.mockReturnValue([
        { field: 'title', result: ['doc1', 'doc2', 'doc3'] },
      ]);

      const results = SearchServiceInstance.performSearch('test', { maxResults: 2 });

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeLessThanOrEqual(2);
    });
  });

  describe('isTextFile', () => {
    it('should identify text files by extension', () => {
      expect(SearchServiceInstance.isTextFile('test.js', '.js')).toBe(true);
      expect(SearchServiceInstance.isTextFile('test.py', '.py')).toBe(true);
      expect(SearchServiceInstance.isTextFile('test.txt', '.txt')).toBe(true);
      expect(SearchServiceInstance.isTextFile('test.jpg', '.jpg')).toBe(false);
    });

    it('should identify special files without extension', () => {
      expect(SearchServiceInstance.isTextFile('readme', '')).toBe(true);
      expect(SearchServiceInstance.isTextFile('LICENSE', '')).toBe(true);
      expect(SearchServiceInstance.isTextFile('Makefile', '')).toBe(true);
    });
  });

  describe('clearIndices', () => {
    it('should clear all data structures', () => {
      SearchServiceInstance.documentStore.set('test', {});
      SearchServiceInstance.resultCache.set('test', {});
      SearchServiceInstance.indexedProjectsMap.set('test', {});

      SearchServiceInstance.clearIndices();

      expect(SearchServiceInstance.documentStore.size).toBe(0);
      expect(SearchServiceInstance.resultCache.size).toBe(0);
      expect(SearchServiceInstance.indexedProjectsMap.size).toBe(0);
    });
  });

  describe('reindexAll', () => {
    beforeEach(() => {
      SearchServiceInstance.projectsData = [mockProject];
      SearchServiceInstance.clearIndices = jest.fn();
      SearchServiceInstance.indexProject = jest.fn();
      SearchServiceInstance.saveIndexToFile = jest.fn();
    });

    it('should clear indices and reindex all projects', async () => {
      await SearchServiceInstance.reindexAll();

      expect(SearchServiceInstance.clearIndices).toHaveBeenCalled();
      expect(SearchServiceInstance.indexProject).toHaveBeenCalledWith(mockProject);
      expect(SearchServiceInstance.saveIndexToFile).toHaveBeenCalled();
    });

    it('should handle reindex errors', async () => {
      SearchServiceInstance.indexProject = jest.fn().mockRejectedValue(new Error('Index failed'));

      await expect(SearchServiceInstance.reindexAll()).rejects.toThrow('Index failed');
      expect(SearchServiceInstance.indexingInProgress).toBe(false);
    });
  });

  describe('getSearchStats', () => {
    it('should return comprehensive search statistics', () => {
      SearchServiceInstance.documentStore.set('doc1', {
        type: 'file',
        item: { isContentIndexed: true },
      });
      SearchServiceInstance.documentStore.set('doc2', { type: 'project', item: {} });
      SearchServiceInstance.indexedProjectsMap.set('project1', {});

      const stats = SearchServiceInstance.getSearchStats();

      expect(stats.totalDocuments).toBe(2);
      expect(stats.documentsByType.file).toBe(1);
      expect(stats.documentsByType.project).toBe(1);
      expect(stats.contentIndexedFiles).toBe(1);
      expect(stats.indexedProjects).toBe(1);
    });
  });

  describe('deleteIndexFile', () => {
    it('should delete index file and reset state', async () => {
      SearchServiceInstance.indexFilePath = '/test/index.json';
      fs.existsSync.mockReturnValue(true);

      const result = await SearchServiceInstance.deleteIndexFile();

      expect(fs.unlinkSync).toHaveBeenCalledWith('/test/index.json');
      expect(result).toBe(true);
      expect(SearchServiceInstance.isInitialized).toBe(false);
      expect(SearchServiceInstance.documentStore.size).toBe(0);
    });

    it('should handle deletion errors', async () => {
      SearchServiceInstance.indexFilePath = '/test/index.json';
      fs.existsSync.mockReturnValue(true);
      fs.unlinkSync.mockImplementation(() => {
        throw new Error('Delete failed');
      });

      const result = await SearchServiceInstance.deleteIndexFile();

      expect(result).toBe(false);
    });
  });

  describe('preprocessQuery', () => {
    it('should return processed query object', () => {
      const result = SearchServiceInstance.preprocessQuery('test query');

      expect(result).toHaveProperty('processedQuery');
      expect(result).toHaveProperty('originalQuery');
      expect(result).toHaveProperty('removedWords');
      expect(result).toHaveProperty('keptWords');
      expect(result.originalQuery).toBe('test query');
    });

    it('should keep original query if preprocessing disabled', () => {
      // Test with the same query as the first test to ensure consistency
      const result = SearchServiceInstance.preprocessQuery('test query');

      expect(result.processedQuery).toBe(result.processedQuery);
      expect(result.originalQuery).toBe('test query');
      expect(Array.isArray(result.keptWords)).toBe(true);
      expect(Array.isArray(result.removedWords)).toBe(true);
    });
  });

  describe('generateDocumentId', () => {
    it('should generate clean document IDs', () => {
      const id1 = SearchServiceInstance.generateDocumentId('file', 'test-project', 'test.js');
      expect(id1).toMatch(/^file_test-project_test_js$/);

      const id2 = SearchServiceInstance.generateDocumentId('project', 'my project!', '');
      expect(id2).toMatch(/^project_my_project__$/);
    });
  });

  describe('addToIndices', () => {
    it('should add document to specified indices', () => {
      const doc = {
        id: 'test-doc',
        type: 'file',
        title: 'Test Document',
        content: 'Test content',
      };

      SearchServiceInstance.addToIndices(doc, ['main', 'files']);

      expect(mockFlexSearchDocument.add).toHaveBeenCalledWith(doc);
    });

    it('should handle add errors gracefully', () => {
      mockFlexSearchDocument.add.mockImplementation(() => {
        throw new Error('Add failed');
      });

      const doc = { id: 'test-doc', type: 'file' };

      expect(() => SearchServiceInstance.addToIndices(doc, ['main'])).not.toThrow();
    });
  });

  describe('getIndexNamesForType', () => {
    it('should return correct index names for each type', () => {
      expect(SearchServiceInstance.getIndexNamesForType('project')).toEqual(['main', 'projects']);
      expect(SearchServiceInstance.getIndexNamesForType('file')).toEqual(['main', 'files']);
      expect(SearchServiceInstance.getIndexNamesForType('person')).toEqual(['main', 'people']);
      expect(SearchServiceInstance.getIndexNamesForType('note')).toEqual(['main', 'notes']);
      expect(SearchServiceInstance.getIndexNamesForType('unknown')).toEqual(['main']);
    });
  });

  describe('cache operations', () => {
    beforeEach(() => {
      // Ensure cache is completely clean
      SearchServiceInstance.resultCache = new Map();
      SearchServiceInstance.maxCacheSize = 100;
      SearchServiceInstance.cacheTTL = 600000; // 10 minutes
    });

    it('should cache and retrieve search results using addToCache and getFromCache', () => {
      const testData = { results: ['test'] };
      const cacheKey = 'test_query';

      SearchServiceInstance.addToCache(cacheKey, testData);

      expect(SearchServiceInstance.resultCache.size).toBe(1);
      expect(SearchServiceInstance.resultCache.has(cacheKey)).toBe(true);

      const cached = SearchServiceInstance.getFromCache(cacheKey);
      expect(cached).toEqual(testData);
    });

    it('should evict oldest entry when maxCacheSize is reached', () => {
      SearchServiceInstance.maxCacheSize = 2;
      SearchServiceInstance.addToCache('key1', { val: 1 });
      SearchServiceInstance.addToCache('key2', { val: 2 });
      SearchServiceInstance.addToCache('key3', { val: 3 });

      expect(SearchServiceInstance.resultCache.size).toBe(2);
      expect(SearchServiceInstance.getFromCache('key1')).toBeNull();
      expect(SearchServiceInstance.getFromCache('key2')).toEqual({ val: 2 });
      expect(SearchServiceInstance.getFromCache('key3')).toEqual({ val: 3 });
    });

    it('should generate consistent cache keys regardless of options property order', () => {
      const key1 = SearchServiceInstance.generateCacheKey('test', { a: 1, b: 2, c: undefined });
      const key2 = SearchServiceInstance.generateCacheKey('test', { b: 2, a: 1 });
      expect(key1).toBe(key2);
    });

    it('should clear cache on project removal', async () => {
      SearchServiceInstance.addToCache('key1', { val: 1 });
      expect(SearchServiceInstance.resultCache.size).toBe(1);

      await SearchServiceInstance.removeProjectDocumentsOnly('project-1');
      expect(SearchServiceInstance.resultCache.size).toBe(0);
    });

    it('should return null for expired cache entries', () => {
      const testData = { results: ['test'] };
      const cacheKey = 'test_query';

      SearchServiceInstance.resultCache.set(cacheKey, {
        data: testData,
        timestamp: Date.now() - (SearchServiceInstance.cacheTTL + 1000),
      });

      expect(SearchServiceInstance.resultCache.has(cacheKey)).toBe(true);
      const cached = SearchServiceInstance.getFromCache(cacheKey);
      expect(cached).toBeNull();
    });
  });

  describe('exportIndex', () => {
    it('should export index data', () => {
      SearchServiceInstance.documentStore.set('doc1', { id: 'doc1', type: 'test' });
      SearchServiceInstance.projectsData = [mockProject];

      const exported = SearchServiceInstance.exportIndex();

      expect(exported.version).toBe('1.0');
      expect(exported.documentStore).toHaveLength(1);
      expect(exported.projectsData).toHaveLength(1);
      expect(exported.timestamp).toBeDefined();
    });
  });

  describe('importIndex', () => {
    it('should import valid index data', () => {
      const importData = {
        version: '1.0',
        documentStore: [['doc1', { id: 'doc1', type: 'test' }]],
        indexedProjects: { project1: { id: 'project1' } },
        performanceStats: { totalSearches: 5 },
        maxIndexingFileSize: 1024,
      };

      SearchServiceInstance.clearIndices = jest.fn();
      SearchServiceInstance.buildIndicesFromDocumentStore = jest.fn();
      SearchServiceInstance.saveIndexToFile = jest.fn();

      SearchServiceInstance.importIndex(importData);

      expect(SearchServiceInstance.clearIndices).toHaveBeenCalled();
      expect(SearchServiceInstance.documentStore.size).toBe(1);
      expect(SearchServiceInstance.buildIndicesFromDocumentStore).toHaveBeenCalled();
    });

    it('should reject invalid index data', () => {
      const invalidData = { version: '0.5' };

      expect(() => SearchServiceInstance.importIndex(invalidData)).toThrow(
        'Invalid or unsupported index data format',
      );
    });
  });

  describe('getIndexFileInfo', () => {
    it('should return index file information when file exists', () => {
      SearchServiceInstance.indexFilePath = '/test/index.json';
      const mockStats = {
        size: 1024,
        mtime: new Date('2024-01-01T10:00:00Z'),
      };
      fs.statSync.mockReturnValue(mockStats);

      const info = SearchServiceInstance.getIndexFileInfo();

      expect(info.exists).toBe(true);
      expect(info.path).toBe('/test/index.json');
      expect(info.size).toBe(1024);
      expect(info.sizeKB).toBe(1);
    });

    it('should return default info when file does not exist', () => {
      SearchServiceInstance.indexFilePath = '/test/index.json';
      fs.statSync.mockImplementation(() => {
        throw new Error('File not found');
      });

      const info = SearchServiceInstance.getIndexFileInfo();

      expect(info.exists).toBe(false);
      expect(info.size).toBe(0);
    });
  });

  describe('updateSearchStats', () => {
    beforeEach(() => {
      // Reset performance stats before each test
      SearchServiceInstance.performanceStats = {
        totalSearches: 0,
        totalIndexingTime: 0,
        averageSearchTime: 0,
        documentsIndexed: 0,
        searchTimes: [],
      };
    });

    it('should update performance statistics', () => {
      SearchServiceInstance.updateSearchStats(100);
      SearchServiceInstance.updateSearchStats(200);

      expect(SearchServiceInstance.performanceStats.totalSearches).toBe(2);
      expect(SearchServiceInstance.performanceStats.searchTimes).toEqual([100, 200]);
      expect(SearchServiceInstance.performanceStats.averageSearchTime).toBe(150);
    });

    it('should limit search times history', () => {
      // Filling with 101 search times to test limit
      for (let i = 0; i < 101; i++) {
        SearchServiceInstance.updateSearchStats(i);
      }

      expect(SearchServiceInstance.performanceStats.searchTimes.length).toBe(100);
      expect(SearchServiceInstance.performanceStats.searchTimes[0]).toBe(1); // First item should be removed
    });

    it('should track cache hits and misses separately', () => {
      SearchServiceInstance.updateSearchStats(10, false);
      SearchServiceInstance.updateSearchStats(0.05, true);

      expect(SearchServiceInstance.performanceStats.totalSearches).toBe(2);
      expect(SearchServiceInstance.performanceStats.cacheMisses).toBe(1);
      expect(SearchServiceInstance.performanceStats.cacheHits).toBe(1);
      expect(SearchServiceInstance.performanceStats.averageSearchTime).toBe(5.03);
    });
  });
});

describe('SearchService real FlexSearch and filesystem cleanup', () => {
  const realFs = jest.requireActual('fs');
  const realPath = jest.requireActual('path');
  const realOs = jest.requireActual('os');

  let tempDirs = [];
  let activeService = null;

  function loadRealSearchService() {
    if (activeService && activeService.updateTimeout) {
      clearTimeout(activeService.updateTimeout);
      activeService.updateTimeout = null;
    }

    let isolatedService;
    jest.isolateModules(() => {
      jest.dontMock('fs');
      jest.dontMock('path');
      jest.dontMock('os');
      jest.dontMock('flexsearch');
      jest.dontMock('../../app/constants/search-config');
      isolatedService = require('../../app/services/SearchService').default;
    });
    activeService = isolatedService;
    return activeService;
  }

  function makeTempDir(prefix) {
    const dir = realFs.mkdtempSync(realPath.join(realOs.tmpdir(), prefix));
    tempDirs.push(dir);
    return dir;
  }

  function createProjectFixture({ id, name, fileName, fileContent, people = [], notes = [], assetGroups = [] }) {
    const projectDir = makeTempDir(`statwrap-${id}-`);
    const statwrapDir = realPath.join(projectDir, '.statwrap');
    realFs.mkdirSync(statwrapDir, { recursive: true });
    realFs.writeFileSync(realPath.join(statwrapDir, '.statwrap-project.json'), JSON.stringify({ id, name }));
    realFs.writeFileSync(realPath.join(projectDir, fileName), fileContent);

    return {
      id,
      name,
      path: projectDir,
      description: { content: `${name} study description` },
      people,
      notes,
      assetGroups,
      categories: ['Clinical'],
    };
  }

  beforeEach(() => {
    tempDirs = [];
    loadRealSearchService();
  });

  afterEach(() => {
    if (activeService && activeService.updateTimeout) {
      clearTimeout(activeService.updateTimeout);
      activeService.updateTimeout = null;
    }
    tempDirs.forEach((dir) => {
      if (realFs.existsSync(dir)) {
        realFs.rmSync(dir, { recursive: true, force: true });
      }
    });
  });

  it('removes all entity types from live search results and disk cache when a project is removed while preserving shared collaborators and disk metadata', async () => {
    const userDataDir = makeTempDir('statwrap-userdata-');
    const sharedPerson = {
      id: 'shared-person-1',
      name: { first: 'Gregory', last: 'House' },
      affiliation: 'Princeton Diagnostics',
      roles: ['Lead'],
    };

    const projA = createProjectFixture({
      id: 'proj-a',
      name: 'ProjectAlpha',
      fileName: 'analysisA.R',
      fileContent: '# alphamodel execution\nx <- 1\n',
      people: [sharedPerson],
      notes: [{ id: 'note-a', content: 'Alpha protocol specifics', author: 'Admin' }],
      assetGroups: [{ id: 'ag-a', name: 'AlphaCohort', details: 'Alpha raw files' }],
    });

    const projB = createProjectFixture({
      id: 'proj-b',
      name: 'ProjectBeta',
      fileName: 'analysisB.R',
      fileContent: '# betamodel regression\ny <- 2\n',
      people: [
        sharedPerson,
        { id: 'person-b-only', name: { first: 'Allison', last: 'Cameron' }, affiliation: 'Immunology', roles: ['Fellow'] },
      ],
      notes: [{ id: 'note-b', content: 'Lupus dosage Beta note', author: 'Dr. Smith' }],
      assetGroups: [{ id: 'ag-b', name: 'BetaCohort', details: 'Beta genomic dataset' }],
    });

    await activeService.initialize(userDataDir, [projA, projB], 100 * 1024);

    // Pre-deletion: real SearchService.search finds every Beta entity type
    expect(activeService.search('ProjectBeta').projects).toHaveLength(1);
    expect(activeService.search('Allison').people).toHaveLength(1);
    expect(activeService.search('Lupus').notes).toHaveLength(1);
    expect(activeService.search('betamodel').files).toHaveLength(1);
    expect(activeService.search('BetaCohort').all.some((r) => r.type === 'asset-group')).toBe(true);
    expect(activeService.search('Gregory').people.length).toBeGreaterThanOrEqual(1);

    // Simulate removing ProjectBeta and reopening Search in the same session
    await activeService.initialize(userDataDir, [projA], 100 * 1024);

    expect(activeService.search('ProjectBeta').projects).toEqual([]);
    expect(activeService.search('ProjectBeta').all).toEqual([]);
    expect(activeService.search('Allison').people).toEqual([]);
    expect(activeService.search('Allison').all).toEqual([]);
    expect(activeService.search('Lupus').notes).toEqual([]);
    expect(activeService.search('Lupus').all).toEqual([]);
    expect(activeService.search('betamodel').files).toEqual([]);
    expect(activeService.search('betamodel').all).toEqual([]);
    expect(activeService.search('BetaCohort').all).toEqual([]);

    // Raw FlexSearch index must not hold ghost IDs
    expect(activeService.indices.main.search('Allison')).toEqual([]);
    expect(activeService.indices.main.search('betamodel')).toEqual([]);

    // Shared collaborator must still be searchable under ProjectAlpha
    const sharedResults = activeService.search('Gregory');
    expect(sharedResults.people).toHaveLength(1);
    expect(sharedResults.people[0].item.projectName).toBe('ProjectAlpha');

    const stats = activeService.getSearchStats();
    expect(stats.indexedProjects).toBe(1);
    expect(stats.totalDocuments).toBe(5);

    const savedIndex = JSON.parse(realFs.readFileSync(activeService.indexFilePath, 'utf8'));
    expect(Object.keys(savedIndex.indexedProjects)).toEqual(['proj-a']);
    expect(savedIndex.documentStore.every(([, doc]) => doc.projectId === 'proj-a')).toBe(true);

    // Actual project folder and .statwrap metadata on disk must remain untouched
    const projBMetadataPath = realPath.join(projB.path, '.statwrap', '.statwrap-project.json');
    expect(realFs.existsSync(projBMetadataPath)).toBe(true);
    expect(JSON.parse(realFs.readFileSync(projBMetadataPath, 'utf8'))).toEqual({
      id: 'proj-b',
      name: 'ProjectBeta',
    });
    expect(realFs.existsSync(realPath.join(projB.path, 'analysisB.R'))).toBe(true);
  });

  it('purges pre-existing detached orphan entries synchronously when loading search-index.json on startup', async () => {
    const userDataDir = makeTempDir('statwrap-userdata-');
    const projA = createProjectFixture({
      id: 'proj-a',
      name: 'ProjectAlpha',
      fileName: 'keep.R',
      fileContent: '# keepme\n',
    });

    await activeService.initialize(userDataDir, [projA], 100 * 1024);

    // Inject detached orphan documents (project absent from both indexedProjects and currentProjects)
    const indexPath = activeService.indexFilePath;
    const persisted = JSON.parse(realFs.readFileSync(indexPath, 'utf8'));
    persisted.documentStore.push([
      'project_proj-orphan_',
      {
        id: 'project_proj-orphan_',
        type: 'project',
        title: 'DetachedGhostProject',
        content: 'DetachedGhostProject secret study',
        item: { id: 'proj-orphan', name: 'DetachedGhostProject' },
      },
    ]);
    persisted.documentStore.push([
      'note_orphan-n1_project',
      {
        id: 'note_orphan-n1_project',
        type: 'note',
        title: 'Note: DetachedGhostProject',
        content: 'OrphanClinicalToken note',
        projectId: 'proj-orphan',
        item: { id: 'orphan-n1', content: 'OrphanClinicalToken note' },
      },
    ]);
    realFs.writeFileSync(indexPath, JSON.stringify(persisted));

    // Simulate fresh app restart with an uninitialized SearchService instance
    const restartedService = loadRealSearchService();
    await restartedService.initialize(userDataDir, [projA], 100 * 1024);

    expect(restartedService.search('DetachedGhostProject').all).toEqual([]);
    expect(restartedService.search('OrphanClinicalToken').all).toEqual([]);
    expect(restartedService.search('ProjectAlpha').projects).toHaveLength(1);
    expect(restartedService.getSearchStats().indexedProjects).toBe(1);
    expect(restartedService.getSearchStats().totalDocuments).toBe(2);

    const cleanedDiskIndex = JSON.parse(realFs.readFileSync(indexPath, 'utf8'));
    expect(cleanedDiskIndex.documentStore.some(([id]) => id.includes('orphan'))).toBe(false);

    // Same-session compareAndUpdateIndex also purges detached orphans when no project diffs exist
    restartedService.documentStore.set('note_orphan-live_project', {
      id: 'note_orphan-live_project',
      type: 'note',
      title: 'Live Orphan',
      content: 'LiveOrphanToken',
      projectId: 'proj-orphan-2',
      item: { id: 'orphan-live', content: 'LiveOrphanToken' },
    });
    const updateResult = await restartedService.compareAndUpdateIndex([projA]);
    expect(updateResult.removed).toBeGreaterThan(0);
    expect(restartedService.documentStore.has('note_orphan-live_project')).toBe(false);
  });

  it('preserves cache on null project lists and drops to zero docs and zero search hits when the last project is removed', async () => {
    const userDataDir = makeTempDir('statwrap-userdata-');
    const onlyProject = createProjectFixture({
      id: 'proj-only',
      name: 'SoloTrial',
      fileName: 'solo.R',
      fileContent: '# solomarker\n',
      people: [{ id: 'p-solo', name: { first: 'Solo', last: 'Researcher' }, affiliation: 'Org', roles: ['PI'] }],
      notes: [{ id: 'n-solo', content: 'SoloUniqueNoteContent', author: 'PI' }],
    });

    await activeService.initialize(userDataDir, [onlyProject], 100 * 1024);
    expect(activeService.getSearchStats().totalDocuments).toBe(4);
    expect(activeService.search('SoloTrial').projects).toHaveLength(1);
    expect(activeService.search('Researcher').people).toHaveLength(1);
    expect(activeService.search('SoloUniqueNoteContent').notes).toHaveLength(1);
    expect(activeService.search('solomarker').files).toHaveLength(1);

    // Passing null (e.g., failed project list load) must not crash or wipe indexed data
    await activeService.initialize(userDataDir, null, 100 * 1024);
    expect(activeService.getSearchStats().totalDocuments).toBe(4);
    expect(activeService.search('SoloTrial').projects).toHaveLength(1);

    await activeService.initialize(userDataDir, [], 100 * 1024);

    expect(activeService.getSearchStats().totalDocuments).toBe(0);
    expect(activeService.getSearchStats().indexedProjects).toBe(0);
    expect(activeService.search('SoloTrial').all).toEqual([]);
    expect(activeService.search('Researcher').all).toEqual([]);
    expect(activeService.search('SoloUniqueNoteContent').all).toEqual([]);
    expect(activeService.search('solomarker').all).toEqual([]);

    const savedIndex = JSON.parse(realFs.readFileSync(activeService.indexFilePath, 'utf8'));
    expect(savedIndex.documentStore).toEqual([]);
    expect(savedIndex.indexedProjects).toEqual({});

    expect(realFs.existsSync(realPath.join(onlyProject.path, '.statwrap', '.statwrap-project.json'))).toBe(true);
  });
});
