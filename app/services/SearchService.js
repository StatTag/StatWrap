import MiniSearch from 'minisearch';
import { ipcRenderer } from 'electron';
import fs from 'fs';
import path from 'path';
import SearchConfig from '../constants/search-config';

/**
 * SearchService - Comprehensive search service for StatWrap using MiniSearch
 * Provides full-text search capabilities across projects, assets, people, notes, and file contents
 */
class SearchService {
  constructor() {
    this.isInitialized = false;
    this.documentStore = new Map();
    this.projectsData = [];
    this.indexingInProgress = false;
    this.indexingQueue = [];
    
    // MiniSearch instance
    this.searchIndex = null;
    
    // Performance tracking
    this.performanceStats = {
      totalSearches: 0,
      totalIndexingTime: 0,
      averageSearchTime: 0,
      documentsIndexed: 0,
      searchTimes: []
    };
    
    // Result caching
    this.resultCache = new Map();
    this.maxCacheSize = SearchConfig?.performance?.resultCacheSize || 100;
    this.cacheTTL = SearchConfig?.performance?.resultCacheTTL || 600000; // 10 minutes
    
    // Auto-tagging patterns
    this.tagPatterns = SearchConfig?.tagging?.statisticalPatterns || {};
    this.commonTags = SearchConfig?.tagging?.commonTags || {};
    
    this.initializeIndex();
  }

  /**
   * Initialize MiniSearch index with custom configuration
   */
  initializeIndex() {
    try {
      this.searchIndex = new MiniSearch({
        fields: [
          'title',          // boost: high
          'content',        // boost: medium
          'filename',       // boost: high
          'projectName',    // boost: medium
          'tags',          // boost: high
          'extension',     // boost: medium
          'author',        // boost: low
          'categories',    // boost: medium
          'path',          // boost: low
          'metadata'       // boost: low
        ],
        storeFields: [
          'id', 'type', 'title', 'content', 'filename', 'extension', 
          'path', 'relativePath', 'projectName', 'projectId', 'tags', 
          'metadata', 'author', 'categories'
        ],
        searchOptions: {
          boost: {
            title: 3,
            filename: 3,
            tags: 2.5,
            content: 1,
            projectName: 1.5,
            categories: 1.5,
            extension: 1.2,
            author: 0.8,
            path: 0.5,
            metadata: 0.3
          },
          fuzzy: 0.2,
          prefix: true,
          combineWith: 'OR'
        }
      });

      console.log('SearchService: MiniSearch index initialized successfully');
    } catch (error) {
      console.error('SearchService: Error initializing MiniSearch index:', error);
    }
  }

  /**
   * Initialize the service with project data 
   */
  async initialize(projects = []) {
    try {
      console.log('SearchService: Starting initialization with', projects.length, 'projects');
      
      this.projectsData = projects;
      this.clearIndex();
      this.isInitialized = true;
      this.indexingInProgress = true;
      
      for (let i = 0; i < projects.length; i++) {
        const project = projects[i];
        console.log(`SearchService: FORCE PROCESSING PROJECT ${i + 1}/${projects.length}: ${project.name}`);
        
        // Index project metadata
        await this.indexProjectMetadata(project);
        if (project.path && fs.existsSync(project.path)) {
          console.log(`SearchService: FORCE SCANNING DIRECTORY: ${project.path}`);
          await this.bruteForceIndexAllFiles(project);
        } else {
          console.error(`SearchService: PROJECT PATH DOES NOT EXIST: ${project.path}`);
        }
        
        // Index people
        if (project.people && Array.isArray(project.people)) {
          for (const person of project.people) {
            await this.indexPerson(person, project);
          }
        }
        
        // Index project notes
        if (project.notes && Array.isArray(project.notes)) {
          for (const note of project.notes) {
            await this.indexNote(note, project, 'project', project.name);
          }
        }
        
        // Small delay between projects
        if (i < projects.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      this.indexingInProgress = false;
      
      console.log('SearchService: Initialization complete');
      console.log('Documents indexed:', this.documentStore.size);
      
      // Log indexing summary
      const stats = this.getSearchStats();
      console.log('SearchService: Indexing Summary:');
      Object.entries(stats.documentsByType).forEach(([type, count]) => {
        console.log(`  ${type}: ${count} documents`);
      });
      console.log(`  Content-indexed files: ${stats.contentIndexedFiles}`);
      
      if (stats.contentIndexedFiles === 0) {
        console.error('SearchService: ❌ No files indexed!!!');
      } else {
        console.log(`SearchService: ✅ YESS! ${stats.contentIndexedFiles} files have content indexed`);
      }
      
    } catch (error) {
      console.error('SearchService: Initialization error:', error);
      this.indexingInProgress = false;
    }
  }

  /**
   * Clear index and document store
   */
  clearIndex() {
    this.documentStore.clear();
    this.resultCache.clear();
    if (this.searchIndex) {
      this.searchIndex.removeAll();
    }
    this.initializeIndex();
  }

  /**
   * Generate unique document ID
   */
  generateDocumentId(type, identifier, subId = '') {
    const cleanId = `${type}_${identifier}_${subId}`.replace(/[^a-zA-Z0-9_-]/g, '_');
    return cleanId;
  }

  /**
   * Brute forcee all index files
   */
  async bruteForceIndexAllFiles(project) {
    console.log(`SearchService: Bruteforce indexing: ${project.path}`);
    
    let totalFiles = 0;
    let indexedFiles = 0;
    
    const scanDirectory = async (dirPath) => {
      try {
        const items = fs.readdirSync(dirPath);
        
        for (const item of items) {
          const fullPath = path.join(dirPath, item);
          const relativePath = path.relative(project.path, fullPath);
          
          try {
            const stats = fs.statSync(fullPath);
            
            if (stats.isDirectory()) {
              // Skip certain directories but scan everything else
              if (!['node_modules', '.git', '.statwrap', '__pycache__', '.venv', 'venv'].includes(item)) {
                await scanDirectory(fullPath);
              }
            } else if (stats.isFile()) {
              totalFiles++;
              
              const extension = path.extname(item).toLowerCase();
              const isTextFile = this.isTextFile(item, extension);
              
              if (isTextFile) {
                console.log(`SearchService: Indexing file: ${relativePath}`);
                const success = await this.absoluteForceIndexFile(fullPath, relativePath, project, stats);
                if (success) {
                  indexedFiles++;
                  console.log(`SearchService: Success: ${relativePath}`);
                } else {
                  console.error(`SearchService: ❌ FAILED: ${relativePath}`);
                }
              } else {
                console.log(`SearchService: Skipping non text files: ${relativePath}`);
              }
              
              // Progress every 10 files
              // if (totalFiles % 10 === 0) {
              //   console.log(`SearchService: Progress: ${totalFiles} files processed, ${indexedFiles} indexed`);
              //   await new Promise(resolve => setTimeout(resolve, 10));
              // }
            }
          } catch (statError) {
            console.warn(`SearchService: Stat error for ${fullPath}: ${statError.message}`);
          }
        }
      } catch (readError) {
        console.error(`SearchService: Read error for ${dirPath}: ${readError.message}`);
      }
    };
    
    await scanDirectory(project.path);
    
    console.log(`SearchService: Brute force donee: ${indexedFiles}/${totalFiles} files indexed for ${project.name}`);
    
    if (indexedFiles === 0) {
      console.error(`SearchService: 0 Files indexed for ${project.name}!`);
    }
  }

  /**
   * Check if file is a text file that should be indexed
   */
  isTextFile(filename, extension) {
    const textExtensions = [
      '.py', '.js', '.jsx', '.ts', '.tsx', '.html', '.htm', '.css', '.scss',
      '.json', '.txt', '.md', '.csv', '.sql', '.xml', '.yaml', '.yml',
      '.ipynb', '.r', '.rmd', '.log', '.sh', '.bat', '.ps1', '.ini', '.conf'
    ];
    
    const specialFiles = ['readme', 'license', 'makefile', 'dockerfile'];
    
    if (textExtensions.includes(extension)) {
      return true;
    }
    
    const lowerName = filename.toLowerCase();
    if (specialFiles.some(special => lowerName.includes(special))) {
      return true;
    }
    
    return false;
  }

  /**
   * absolute force indexing no excuse
   */
  async absoluteForceIndexFile(fullPath, relativePath, project, stats) {
    try {
      console.log(`SearchService: READINGGG: ${fullPath}`);
      let content = '';
      try {
        content = fs.readFileSync(fullPath, 'utf8');
        console.log(`SearchService: Read success: ${relativePath} (${content.length} characters)`);
      } catch (readError) {
        console.error(`SearchService: Failed reading: ${relativePath} - ${readError.message}`);
        return false;
      }
      
      // if (content.length === 0) {
      //   console.log(`SearchService: 📄 EMPTY FILE: ${relativePath}`);
      //   content = ''; // not index empty files
      // }
      
      const extension = path.extname(relativePath).toLowerCase();
      const filename = path.basename(relativePath);
      
       // Building the search document
      const tags = this.generateTags(content, 'file', extension);
      
      const doc = {
        id: this.generateDocumentId('file', relativePath),
        type: 'file',
        title: filename,
        content: content, 
        filename: filename,
        extension: extension,
        path: relativePath,
        relativePath: relativePath,
        projectName: project.name,
        projectId: project.id,
        tags: tags.join(' '), 
        metadata: JSON.stringify({
          size: stats.size,
          lastModified: stats.mtime,
          isContentIndexed: true,
          source: 'brute-force',
          contentLength: content.length
        })
      };
      
      this.searchIndex.add(doc);
      this.documentStore.set(doc.id, { 
        ...doc, 
        item: { 
          uri: relativePath,
          name: filename,
          size: stats.size,
          lastModified: stats.mtime,
          snippet: content.substring(0, 300) + (content.length > 300 ? '...' : ''),
          isContentIndexed: true,
          projectName: project.name,
          fullPath: fullPath,
          type: 'file',
          actualContent: content
        } 
      });
      
      console.log(`SearchService: 💾 indexed: ${relativePath} with ${content.length} chars of content`);
      return true;
      
    } catch (error) {
      console.error(`SearchService: error!!!!! for ${relativePath}:`, error);
      return false;
    }
  }

  /**
   * Index project metadata
   */
  async indexProjectMetadata(project) {
    const doc = {
      id: this.generateDocumentId('project', project.id),
      type: 'project',
      title: project.name,
      content: this.extractProjectContent(project),
      filename: '',
      extension: '',
      path: project.path,
      relativePath: '',
      projectName: project.name,
      projectId: project.id,
      tags: this.generateTags(this.extractProjectContent(project), 'project').join(' '),
      categories: (project.categories || []).join(' '),
      metadata: JSON.stringify({
        id: project.id,
        path: project.path,
        favorite: project.favorite,
        peopleCount: project.people ? project.people.length : 0,
        noteCount: project.notes ? project.notes.length : 0
      })
    };

    this.searchIndex.add(doc);
    this.documentStore.set(doc.id, { ...doc, item: project });
  }

  /**
   * Extract searchable content from project
   */
  extractProjectContent(project) {
    const parts = [
      project.name || '',
      project.description?.content || '',
      project.description?.uriContent || '',
      (project.categories || []).join(' '),
      (project.notes || []).map(note => note.content).join(' ')
    ];
    
    return parts.filter(part => part && part.trim()).join(' ');
  }

  /**
   * Index a person
   */
  async indexPerson(person, project) {
    if (!person || !person.id) return;
    
    const searchableContent = [
      this.formatPersonName(person.name),
      person.affiliation || '',
      (person.roles || []).join(' '),
      (person.notes || []).map(note => note.content).join(' ')
    ].filter(part => part && part.trim()).join(' ');
    
    const tags = this.generateTags(searchableContent, 'person');
    
    const doc = {
      id: this.generateDocumentId('person', person.id),
      type: 'person',
      title: this.formatPersonName(person.name),
      content: searchableContent,
      filename: '',
      extension: '',
      path: '',
      relativePath: '',
      projectName: project.name,
      projectId: project.id,
      tags: tags.join(' '),
      author: this.formatPersonName(person.name),
      metadata: JSON.stringify({
        id: person.id,
        roleCount: person.roles ? person.roles.length : 0,
        noteCount: person.notes ? person.notes.length : 0
      })
    };
    
    this.searchIndex.add(doc);
    this.documentStore.set(doc.id, { 
      ...doc, 
      item: { 
        ...person, 
        projectName: project.name 
      } 
    });

    // Index person notes separately
    if (person.notes && Array.isArray(person.notes)) {
      for (const note of person.notes) {
        await this.indexNote(note, project, 'person', this.formatPersonName(person.name));
      }
    }
  }

  /**
   * Index a note
   */
  async indexNote(note, project, entityType, entityName) {
    if (!note || !note.content) return;
    
    const tags = this.generateTags(note.content, 'note');
    
    const doc = {
      id: this.generateDocumentId('note', note.id || Date.now(), entityType),
      type: 'note',
      title: `Note: ${entityName}`,
      content: note.content,
      filename: '',
      extension: '',
      path: '',
      relativePath: '',
      projectName: project.name,
      projectId: project.id,
      tags: tags.join(' '),
      author: note.author || '',
      metadata: JSON.stringify({
        noteType: entityType,
        created: note.created,
        updated: note.updated,
        contentLength: note.content.length
      })
    };
    
    this.searchIndex.add(doc);
    this.documentStore.set(doc.id, { 
      ...doc, 
      item: { 
        ...note, 
        noteType: entityType,
        entityName: entityName,
        projectName: project.name 
      } 
    });
  }

  /**
   * Generate tags for content analysis
   */
  generateTags(content, type, extension = '') {
    const tags = new Set();
    
    // Add type-based tags
    tags.add(type);
    
    // Add extension-based tags
    if (extension) {
      tags.add(`ext-${extension.replace('.', '')}`);
    }
    
    // Content-based tag generation for statistical patterns
    if (content && typeof content === 'string') {
      const lowerContent = content.toLowerCase();
      
      // Check for common research terms
      Object.entries(this.commonTags).forEach(([category, terms]) => {
        if (Array.isArray(terms)) {
          terms.forEach(term => {
            if (lowerContent.includes(term.toLowerCase())) {
              tags.add(`${category}-${term}`);
            }
          });
        }
      });
    }
    
    return Array.from(tags);
  }

  /**
   * Format person name consistently
   */
  formatPersonName(name) {
    if (!name) return '';
    
    if (typeof name === 'string') return name;
    
    const parts = [];
    if (name.first) parts.push(name.first);
    if (name.middle) parts.push(name.middle);
    if (name.last) parts.push(name.last);
    
    return parts.join(' ').trim();
  }

  /**
   * Perform search across all indexed content using MiniSearch
   */
  search(query, options = {}) {
    if (!this.isInitialized) {
      console.warn('SearchService: Service not initialized');
      return this.getEmptyResults();
    }
    
    if (!query || typeof query !== 'string' || query.trim() === '') {
      return this.getEmptyResults();
    }
    
    const startTime = Date.now();
    const cacheKey = this.generateCacheKey(query, options);
    
    // Check cache first
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      console.log('SearchService: Returning cached results');
      return cached;
    }
    
    try {
      const searchResults = this.performSearch(query, options);
      const groupedResults = this.groupResultsByType(searchResults);
      
      // Update performance stats
      const searchTime = Date.now() - startTime;
      this.updateSearchStats(searchTime);
      
      // Cache results
      this.addToCache(cacheKey, groupedResults);
      
      console.log(`SearchService: Search completed in ${searchTime}ms, found ${searchResults.length} results`);
      
      return groupedResults;
      
    } catch (error) {
      console.error('SearchService: Search error:', error);
      return this.getEmptyResults();
    }
  }

  /**
   * Perform the actual search using MiniSearch
   */
  performSearch(query, options = {}) {
    const {
      type,
      projectId,
      maxResults = SearchConfig?.search?.maxResults || 1000,
      fuzzy = SearchConfig?.search?.enableFuzzySearch || true
    } = options;
    
    // Build search options for MiniSearch
    const searchOptions = {
      fuzzy: fuzzy ? 0.2 : false,
      prefix: true,
      combineWith: 'OR',
      boost: {
        title: 3,
        filename: 3,
        tags: 2.5,
        content: 1,
        projectName: 1.5,
        categories: 1.5
      }
    };
    
    // Perform search
    let results = this.searchIndex.search(query, searchOptions);
    
    // Filter and enrich results
    let filteredResults = results
      .slice(0, maxResults)
      .map(result => this.enrichSearchResult(result))
      .filter(result => result !== null);
    
    // Apply additional filters
    if (type && type !== 'all') {
      filteredResults = filteredResults.filter(result => result.type === type);
    }
    
    if (projectId && projectId !== 'all') {
      filteredResults = filteredResults.filter(result => 
        result.item && result.item.projectId === projectId
      );
    }
    
    return filteredResults;
  }

  /**
   * Enrich search result with document data
   */
  enrichSearchResult(result) {
    const docData = this.documentStore.get(result.id);
    if (!docData) {
      console.warn(`SearchService: Document not found in store: ${result.id}`);
      return null;
    }
    
    return {
      score: result.score,
      type: docData.type,
      item: docData.item,
      highlights: this.generateHighlights(docData, result)
    };
  }

  /**
   * Generate highlights for search results
   */
  generateHighlights(docData, result) {
    const highlights = {};
    
    if (docData.content && result.score > 0.1) {
      highlights.content = [docData.content.substring(0, 200)];
    }
    
    return highlights;
  }

  /**
   * Group search results by type
   */
  groupResultsByType(results) {
    const grouped = {
      projects: [],
      people: [],
      assets: [],
      files: [],
      folders: [],
      notes: [],
      all: [...results]
    };
    
    results.forEach(result => {
      switch (result.type) {
        case 'project':
          grouped.projects.push(result);
          break;
        case 'person':
          grouped.people.push(result);
          break;
        case 'file':
          grouped.files.push(result);
          break;
        case 'folder':
          grouped.folders.push(result);
          break;
        case 'note':
          grouped.notes.push(result);
          break;
        default:
          break;
      }
    });
    
    return grouped;
  }

  /**
   * Advanced search with enhanced features
   */
  advancedSearch(query, options = {}) {
    // For MiniSearch, advanced search uses the same engine with different options
    return this.search(query, {
      ...options,
      fuzzy: true,
      boost: true
    });
  }

  /**
   * Get search suggestions based on partial query
   */
  getSuggestions(partialQuery) {
    if (!this.isInitialized || !partialQuery || partialQuery.length < 2) {
      return [];
    }
    
    const suggestions = new Set();
    const maxSuggestions = SearchConfig?.ui?.maxSuggestions || 8;
    
    // Use MiniSearch for suggestions
    try {
      const results = this.searchIndex.search(partialQuery, {
        prefix: true,
        fuzzy: 0.1,
        combineWith: 'OR'
      });
      
      results.slice(0, maxSuggestions).forEach(result => {
        if (result.title) {
          suggestions.add(result.title);
        }
        if (result.filename) {
          suggestions.add(result.filename);
        }
      });
    } catch (error) {
      console.warn('SearchService: Error getting suggestions:', error);
    }
    
    return Array.from(suggestions).slice(0, maxSuggestions);
  }

  /**
   * Reindex all projects with full content
   */
  async reindexAll() {
    console.log('SearchService: Starting complete reindex');
    
    this.clearIndex();
    this.indexingInProgress = true;
    
    for (const project of this.projectsData) {
      await this.indexProjectMetadata(project);
      if (project.path && fs.existsSync(project.path)) {
        await this.bruteForceIndexAllFiles(project);
      }
      
      if (project.people && Array.isArray(project.people)) {
        for (const person of project.people) {
          await this.indexPerson(person, project);
        }
      }
      
      if (project.notes && Array.isArray(project.notes)) {
        for (const note of project.notes) {
          await this.indexNote(note, project, 'project', project.name);
        }
      }
    }
    
    this.indexingInProgress = false;
    console.log('SearchService: Complete reindex finished');
    
    const stats = this.getSearchStats();
    console.log('SearchService: Reindex Summary:');
    Object.entries(stats.documentsByType).forEach(([type, count]) => {
      console.log(`  ${type}: ${count} documents`);
    });
    console.log(`  Content-indexed files: ${stats.contentIndexedFiles}`);
  }

  /**
   * Export search index for backup/transfer
   */
  exportIndex() {
    return {
      version: '1.0',
      timestamp: new Date().toISOString(),
      documentStore: Array.from(this.documentStore.entries()),
      performanceStats: this.performanceStats,
      projectsData: this.projectsData.map(p => ({
        id: p.id,
        name: p.name,
        path: p.path
      }))
    };
  }

  /**
   * Import search index from backup
   */
  importIndex(indexData) {
    if (!indexData || indexData.version !== '1.0') {
      throw new Error('Invalid or unsupported index data format');
    }
    
    console.log('SearchService: Importing index data');
    
    this.clearIndex();
    
    // Restore document store
    this.documentStore = new Map(indexData.documentStore);
    
    // Rebuild MiniSearch index from document store
    const docs = [];
    this.documentStore.forEach(doc => {
      docs.push(doc);
    });
    
    this.searchIndex.addAll(docs);
    
    // Restore performance stats
    if (indexData.performanceStats) {
      this.performanceStats = { ...this.performanceStats, ...indexData.performanceStats };
    }
    
    console.log('SearchService: Index import completed');
  }

  /**
   * Generate cache key for search results
   */
  generateCacheKey(query, options) {
    return `${query}_${JSON.stringify(options)}`.replace(/[^a-zA-Z0-9_]/g, '_');
  }

  /**
   * Get results from cache
   */
  getFromCache(key) {
    const cached = this.resultCache.get(key);
    if (!cached) return null;
    
    if (Date.now() - cached.timestamp > this.cacheTTL) {
      this.resultCache.delete(key);
      return null;
    }
    
    return cached.data;
  }

  /**
   * Add results to cache
   */
  addToCache(key, data) {
    if (this.resultCache.size >= this.maxCacheSize) {
      const firstKey = this.resultCache.keys().next().value;
      this.resultCache.delete(firstKey);
    }
    
    this.resultCache.set(key, {
      data: data,
      timestamp: Date.now()
    });
  }

  /**
   * Update search performance statistics
   */
  updateSearchStats(searchTime) {
    this.performanceStats.totalSearches++;
    this.performanceStats.searchTimes.push(searchTime);
    
    if (this.performanceStats.searchTimes.length > 100) {
      this.performanceStats.searchTimes = this.performanceStats.searchTimes.slice(-100);
    }
    
    const sum = this.performanceStats.searchTimes.reduce((a, b) => a + b, 0);
    this.performanceStats.averageSearchTime = sum / this.performanceStats.searchTimes.length;
  }

  /**
   * Get search statistics
   */
  getSearchStats() {
    const docsByType = {};
    this.documentStore.forEach(doc => {
      docsByType[doc.type] = (docsByType[doc.type] || 0) + 1;
    });
    
    // Calculate content-indexed files
    let contentIndexedCount = 0;
    this.documentStore.forEach(doc => {
      if (doc.item && doc.item.isContentIndexed) {
        contentIndexedCount++;
      }
    });
    
    return {
      totalDocuments: this.documentStore.size,
      documentsByType: docsByType,
      contentIndexedFiles: contentIndexedCount,
      indexedProjects: this.projectsData.length,
      indexingInProgress: this.indexingInProgress,
      queueLength: this.indexingQueue.length,
      performance: this.performanceStats,
      cacheStats: {
        size: this.resultCache.size,
        maxSize: this.maxCacheSize
      }
    };
  }

  /**
   * Get empty search results structure
   */
  getEmptyResults() {
    return {
      projects: [],
      people: [],
      assets: [],
      files: [],
      folders: [],
      notes: [],
      all: []
    };
  }

  /**
   * Check if service is ready for searching
   */
  isReady() {
    return this.isInitialized && !this.indexingInProgress;
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      initialized: this.isInitialized,
      indexingInProgress: this.indexingInProgress,
      queueLength: this.indexingQueue.length,
      totalDocuments: this.documentStore.size,
      cacheSize: this.resultCache.size
    };
  }

  /**
   * Clear all caches
   */
  clearCaches() {
    this.resultCache.clear();
    console.log('SearchService: Caches cleared');
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    this.clearIndex();
    this.clearCaches();
    this.indexingQueue.length = 0;
    this.indexingInProgress = false;
    this.isInitialized = false;
    console.log('SearchService: Cleanup completed');
  }

  /**
   * Queue a project for content indexing 
   */
  queueProjectForContentIndexing(project) {
    // In MiniSearch implementation, we do full indexing upfront
    console.log(`SearchService: Full indexing already done for ${project.name}, skipping queue`);
  }

  /**
   * Process the indexing queue (simplified since we do full indexing upfront)
   */
  async processIndexingQueue() {
    // Queue is no longer used for initial indexing in MiniSearch version
    if (this.indexingQueue.length === 0) return;
    
    console.log(`SearchService: Processing ${this.indexingQueue.length} remaining items in queue`);
    
    // Clear the queue since full indexing is already done
    this.indexingQueue.length = 0;
    this.indexingInProgress = false;
    
    console.log('SearchService: Queue cleared - full indexing already completed');
  }

  /**
   * Index external assets (if any)
   */
  async indexExternalAssets(externalAssets, project) {
    if (!externalAssets || !externalAssets.children) return;
    
    for (const asset of externalAssets.children) {
      await this.indexExternalAsset(asset, project);
    }
  }

  /**
   * Index an external asset
   */
  async indexExternalAsset(asset, project) {
    if (!asset || !asset.uri) return;
    
    const searchableContent = [
      asset.name || asset.uri,
      asset.uri,
      (asset.notes || []).map(note => note.content).join(' '),
      Object.values(asset.attributes || {}).join(' ')
    ].filter(part => part && part.trim()).join(' ');
    
    const tags = this.generateTags(searchableContent, 'external-asset');
    
    const doc = {
      id: this.generateDocumentId('external-asset', asset.uri),
      type: 'external-asset',
      title: asset.name || asset.uri,
      content: searchableContent,
      filename: '',
      extension: '',
      path: asset.uri,
      relativePath: '',
      projectName: project.name,
      projectId: project.id,
      tags: tags.join(' '),
      metadata: JSON.stringify({
        noteCount: asset.notes ? asset.notes.length : 0,
        attributeCount: asset.attributes ? Object.keys(asset.attributes).length : 0
      })
    };
    
    this.searchIndex.add(doc);
    this.documentStore.set(doc.id, { 
      ...doc, 
      item: { 
        ...asset, 
        projectName: project.name 
      } 
    });

    // Index external asset notes
    if (asset.notes && Array.isArray(asset.notes)) {
      for (const note of asset.notes) {
        await this.indexNote(note, project, 'external-asset', asset.uri);
      }
    }
  }

  /**
   * Index an asset group
   */
  async indexAssetGroup(group, project) {
    if (!group || !group.id) return;
    
    const searchableContent = [
      group.name || '',
      group.details || '',
      (group.assets || []).map(asset => asset.uri).join(' ')
    ].filter(part => part && part.trim()).join(' ');
    
    const tags = this.generateTags(searchableContent, 'asset-group');
    
    const doc = {
      id: this.generateDocumentId('asset-group', group.id),
      type: 'asset-group',
      title: group.name,
      content: searchableContent,
      filename: '',
      extension: '',
      path: '',
      relativePath: '',
      projectName: project.name,
      projectId: project.id,
      tags: tags.join(' '),
      metadata: JSON.stringify({
        id: group.id,
        assetCount: group.assets ? group.assets.length : 0,
        details: group.details
      })
    };
    
    this.searchIndex.add(doc);
    this.documentStore.set(doc.id, { 
      ...doc, 
      item: { 
        ...group, 
        projectName: project.name 
      } 
    });
  }

  /**
   * Remove duplicates from search results
   */
  removeDuplicateResults(results) {
    const seen = new Set();
    return results.filter(result => {
      const key = result.item?.id || result.item?.uri || JSON.stringify(result.item);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  /**
   * Parse search query for advanced operators (simplified for MiniSearch)
   */
  parseSearchQuery(query) {
    const parsed = {
      query: query,
      fieldBoosts: {},
      fieldRestrictions: [],
      requiredTerms: [],
      excludedTerms: []
    };
    
    if (!SearchConfig?.advanced?.enableSearchOperators) {
      return parsed;
    }
    
    let processedQuery = query;
    
    // Extract field searches (field:value)
    const fieldPattern = /(\w+):(\w+)/g;
    let match;
    while ((match = fieldPattern.exec(query)) !== null) {
      const [fullMatch, field, value] = match;
      parsed.fieldRestrictions.push({ field, value });
      processedQuery = processedQuery.replace(fullMatch, value);
    }
    
    // Extract required terms (+term)
    const requiredPattern = /\+(\w+)/g;
    while ((match = requiredPattern.exec(processedQuery)) !== null) {
      parsed.requiredTerms.push(match[1]);
      processedQuery = processedQuery.replace(match[0], match[1]);
    }
    
    // Extract excluded terms (-term)
    const excludedPattern = /-(\w+)/g;
    while ((match = excludedPattern.exec(processedQuery)) !== null) {
      parsed.excludedTerms.push(match[1]);
      processedQuery = processedQuery.replace(match[0], '');
    }
    
    parsed.query = processedQuery.trim();
    return parsed;
  }

  /**
   * Get appropriate index names for a document type (compatibility method)
   */
  getIndexNamesForType(type) {
    // MiniSearch uses a single index, so this is mainly for compatibility
    return ['main'];
  }

  /**
   * Resolve full path for an asset
   */
  resolveFullPath(assetUri, projectPath) {
    if (!assetUri || !projectPath) return assetUri || '';
    
    try {
      if (path.isAbsolute(assetUri)) {
        return assetUri;
      }
      return path.join(projectPath, assetUri);
    } catch (error) {
      return assetUri;
    }
  }

  /**
   * Extract file extension from path
   */
  extractExtension(filePath) {
    if (!filePath) return '';
    
    // Handle special cases first
    const basename = this.getBasename(filePath).toLowerCase();
    
    // Check for files like "abc.ipynb"
    if (basename.includes('.ipynb')) {
      return '.ipynb';
    }
    
    // Check for files like "app.py"
    const standardExt = path.extname(filePath).toLowerCase();
    if (standardExt) {
      return standardExt;
    }
    
    // Check for files without extension but with recognizable patterns
    if (basename.includes('makefile')) return '.makefile';
    if (basename.includes('dockerfile')) return '.dockerfile';
    if (basename.includes('readme')) return '.readme';
    if (basename.includes('license')) return '.license';
    
    return '';
  }

  /**
   * Get basename from path
   */
  getBasename(filePath) {
    if (!filePath) return '';
    return path.basename(filePath);
  }

  /**
   * Get relative path from project base
   */
  getRelativePath(filePath, projectPath) {
    if (!filePath || !projectPath) return filePath || '';
    
    try {
      return path.relative(projectPath, filePath);
    } catch (error) {
      return filePath;
    }
  }
}

const searchServiceInstance = new SearchService();
export default searchServiceInstance;