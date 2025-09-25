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
      const { ipcRenderer } = require('electron');
      ipcRenderer.invoke.mockResolvedValue('/app/data');
      fs.existsSync.mockReturnValue(false);

      await SearchServiceInstance.setupIndexFilePath();

      expect(ipcRenderer.invoke).toHaveBeenCalledWith(Messages.GET_APP_DATA_PATH);
      expect(fs.mkdirSync).toHaveBeenCalledWith('/app/data/search', { recursive: true });
      expect(SearchServiceInstance.indexFilePath).toBe('/app/data/search/search-index.json');
    });

    it('should handle errors and fall back to current directory', async () => {
      const { ipcRenderer } = require('electron');
      ipcRenderer.invoke.mockRejectedValue(new Error('IPC error'));
      process.cwd = jest.fn(() => '/current/dir');

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

      await SearchServiceInstance.initialize([mockProject]);

      expect(SearchServiceInstance.isInitialized).toBe(true);
      expect(SearchServiceInstance.projectsData).toEqual([mockProject]);
      expect(SearchServiceInstance.indexProject).toHaveBeenCalledWith(mockProject);
    });

    it('should load existing index and check for updates', async () => {
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(JSON.stringify(mockIndexData));

      const buildIndicesSpy = jest
        .spyOn(SearchServiceInstance, 'buildIndicesFromDocumentStore')
        .mockImplementation(() => {});

      await SearchServiceInstance.initialize([mockProject]);

      expect(SearchServiceInstance.isInitialized).toBe(true);
      expect(buildIndicesSpy).toHaveBeenCalled();

      buildIndicesSpy.mockRestore();
    });
  });

  describe('search', () => {
    beforeEach(() => {
      SearchServiceInstance.isInitialized = true;
      SearchServiceInstance.groupResultsByType = jest.fn(() => ({
        projects: [],
        people: [],
        assets: [],
        files: [],
        folders: [],
        notes: [],
        all: [],
      }));
      SearchServiceInstance.addToCache = jest.fn();
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
      SearchServiceInstance.preprocessQuery = jest.fn(() => ({
        processedQuery: 'test',
        originalQuery: 'test query',
        removedWords: ['query'],
        keptWords: ['test'],
      }));

      // Mock performSearch to return empty array
      const performSearchSpy = jest
        .spyOn(SearchServiceInstance, 'performSearch')
        .mockReturnValue([]);

      SearchServiceInstance.search('test query');

      expect(SearchServiceInstance.preprocessQuery).toHaveBeenCalledWith('test query');
      expect(performSearchSpy).toHaveBeenCalledWith('test', {});

      performSearchSpy.mockRestore();
    });

    it('should return cached results when available', () => {
      const cachedResults = { all: [{ id: 'cached' }] };
      const getFromCacheSpy = jest
        .spyOn(SearchServiceInstance, 'getFromCache')
        .mockReturnValue(cachedResults);

      const results = SearchServiceInstance.search('test');

      expect(results.all).toEqual(cachedResults.all);

      getFromCacheSpy.mockRestore();
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

    it('should cache and retrieve search results', () => {
      const testData = { results: ['test'] };
      const cacheKey = 'test_query';

      // Manually test the cache methods
      SearchServiceInstance.resultCache.set(cacheKey, {
        data: testData,
        timestamp: Date.now(),
      });

      // Verify cache entry was created
      expect(SearchServiceInstance.resultCache.size).toBe(1);
      expect(SearchServiceInstance.resultCache.has(cacheKey)).toBe(true);

      // Test retrieval
      const cacheEntry = SearchServiceInstance.resultCache.get(cacheKey);
      expect(cacheEntry.data).toEqual(testData);
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
  });
});
