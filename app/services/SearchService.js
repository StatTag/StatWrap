// app/services/SearchService.js
import Fuse from 'fuse.js';
import fs from 'fs';
import path from 'path';
import SearchConfig from '../constants/search-config';

/**
 * SearchService - Comprehensive search service using Fuse.js
 * Provides full-text search capabilities across projects, assets, people, notes, and file contents
 */
class SearchService {
  constructor() {
    this.isInitialized = false;
    this.documentStore = new Map();
    this.projectsData = [];
    this.indexingInProgress = false;
    this.indexingQueue = [];

    // Fuse.js instances for different content types
    this.fuseInstances = {
      main: null,
      projects: null,
      files: null,
      people: null,
      notes: null
    };

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

    this.initializeFuseOptions();
  }

  /**
   * Initialize Fuse.js options for different content types
   */
  initializeFuseOptions() {
    // Main comprehensive search options
    this.fuseOptions = {
      main: {
        keys: [
          { name: 'title', weight: 0.3 },
          { name: 'content', weight: 0.2 },
          { name: 'filename', weight: 0.25 },
          { name: 'projectName', weight: 0.35 },
          { name: 'tags', weight: 0.2 },
          { name: 'extension', weight: 0.1 },
          { name: 'author', weight: 0.1 },
          { name: 'categories', weight: 0.15 }
        ],
        threshold: 0.5,
        // distance: 1000, 
        minMatchCharLength: 1, //allow single character matches
        includeScore: true,
        includeMatches: true,
        shouldSort: true,
        findAllMatches: false, //find all matches or not
        location: 0,
        useExtendedSearch: true,
        ignoreLocation: true, //ignore location constraints
        ignoreFieldNorm: false
      },

      // Specialized options for different content types
      projects: {
        keys: [
          { name: 'name', weight: 0.4 },
          { name: 'description', weight: 0.3 },
          { name: 'categories', weight: 0.3 }
        ],
        threshold: 0.6,
        includeScore: true,
        includeMatches: true,
        useExtendedSearch: true,
        ignoreLocation: true 
      },

      files: {
        keys: [
          { name: 'filename', weight: 0.3 },
          { name: 'content', weight: 0.4 },
          { name: 'extension', weight: 0.2 },
          { name: 'tags', weight: 0.1 }
        ],
        threshold: 0.15, 
        distance: 1000, 
        minMatchCharLength: 1, 
        includeScore: true,
        includeMatches: true,
        useExtendedSearch: true,
        ignoreLocation: true 
      },

      people: {
        keys: [
          { name: 'name', weight: 0.4 },
          { name: 'affiliation', weight: 0.3 },
          { name: 'roles', weight: 0.3 }
        ],
        threshold: 0.6,
        includeScore: true,
        includeMatches: true,
        useExtendedSearch: true,
        ignoreLocation: true 
      },

      notes: {
        keys: [
          { name: 'content', weight: 0.6 },
          { name: 'author', weight: 0.2 },
          { name: 'entityName', weight: 0.2 }
        ],
        threshold: 0.6,
        distance: 1000, 
        includeScore: true,
        includeMatches: true,
        useExtendedSearch: true,
        ignoreLocation: true 
      }
    };

    console.log('SearchService: Fixed Fuse.js options initialized successfully');
  }

  /**
   * Alternative: Even more lenient configuration for debugging
   */
  // initializeDebugFuseOptions() {
    
  //   this.fuseOptions = {
  //     main: {
  //       keys: [
  //         'title', 'content', 'filename', 'projectName', 'tags', 'extension', 'author', 'categories'
  //       ],
  //       threshold: 0.6, 
  //       distance: 10000, 
  //       minMatchCharLength: 1,
  //       includeScore: true,
  //       includeMatches: true,
  //       shouldSort: true,
  //       findAllMatches: true,
  //       ignoreLocation: true, 
  //       ignoreFieldNorm: true 
  //     }
  //   };

  //   Object.keys(this.fuseOptions).forEach(key => {
  //     if (key !== 'main') {
  //       this.fuseOptions[key] = { ...this.fuseOptions.main };
  //     }
  //   });
  // }

  /**
   * Debug search function to test different configurations
   */
  // debugSearch(query) {
  //   console.log('🔍 DEBUG SEARCH for:', query);
  //   console.log('Document store size:', this.documentStore.size);

  //   // different configurations
  //   const testConfigs = [
  //     { name: 'Very Lenient', threshold: 0.9, ignoreLocation: true },
  //     { name: 'Moderate', threshold: 0.6, ignoreLocation: true },
  //     { name: 'Current', threshold: 0.6, ignoreLocation: false }
  //   ];

  //   testConfigs.forEach(config => {
  //     const testFuse = new Fuse(
  //       Array.from(this.documentStore.values()),
  //       {
  //         keys: ['title', 'content', 'filename'],
  //         threshold: config.threshold,
  //         ignoreLocation: config.ignoreLocation,
  //         includeScore: true
  //       }
  //     );

  //     const results = testFuse.search(query);
  //     console.log(`${config.name} config (threshold: ${config.threshold}):`, results.length, 'results');

  //     if (results.length > 0) {
  //       console.log('Sample result:', results[0]);
  //     }
  //   });
  // }


  /**
   * Initialize the service with project data
   */
  async initialize(projects = []) {
    try {
      console.log('SearchService: Starting initialization with', projects.length, 'projects');

      this.projectsData = projects;
      this.clearIndices();

      // Set initialized immediately to allow UI to function 
      this.isInitialized = true;
      this.indexingInProgress = true;

      const allDocuments = [];

      for (let i = 0; i < projects.length; i++) {
        const project = projects[i];
        console.log(`SearchService: Processing project ${i + 1}/${projects.length}: ${project.name}`);

        // Index project metadata
        const projectDoc = await this.indexProjectMetadata(project);
        if (projectDoc) allDocuments.push(projectDoc);
        if (project.path && fs.existsSync(project.path)) {
          console.log(`SearchService: Scanning directory : ${project.path}`);
          const fileDocs = await this.bruteForceIndexAllFiles(project);
          allDocuments.push(...fileDocs);
        } else {
          console.error(`SearchService: Path DNE: ${project.path}`);
        }

        // Index people
        if (project.people && Array.isArray(project.people)) {
          for (const person of project.people) {
            const personDoc = await this.indexPerson(person, project);
            if (personDoc) allDocuments.push(personDoc);
          }
        }

        // Index project notes
        if (project.notes && Array.isArray(project.notes)) {
          for (const note of project.notes) {
            const noteDoc = await this.indexNote(note, project, 'project', project.name);
            if (noteDoc) allDocuments.push(noteDoc);
          }
        }

        // Small delay between projects
        if (i < projects.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      // Create Fuse.js instances with all documents
      this.createFuseInstances(allDocuments);

      this.indexingInProgress = false;

      console.log('SearchService: Initialization complete');
      console.log('Documents indexed:', this.documentStore.size);

      // Log indexing summary
      const stats = this.getSearchStats();
      console.log('SearchService: Indexing Summary:');
      Object.entries(stats.documentsByType).forEach(([type, count]) => {
        console.log(`  ${type}: ${count} documents`);
      });
      console.log(`Content-indexed files: ${stats.contentIndexedFiles}`);

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
   * Create Fuse.js instances with indexed documents
   */
  createFuseInstances(allDocuments) {
    console.log('SearchService: Creating Fuse.js instances with', allDocuments.length, 'documents');

    // Main instance with all documents
    this.fuseInstances.main = new Fuse(allDocuments, this.fuseOptions.main);

    // Specialized instances
    const projectDocs = allDocuments.filter(doc => doc.type === 'project');
    this.fuseInstances.projects = new Fuse(projectDocs, this.fuseOptions.projects);

    const fileDocs = allDocuments.filter(doc => doc.type === 'file' || doc.type === 'folder');
    this.fuseInstances.files = new Fuse(fileDocs, this.fuseOptions.files);

    const peopleDocs = allDocuments.filter(doc => doc.type === 'person');
    this.fuseInstances.people = new Fuse(peopleDocs, this.fuseOptions.people);

    const noteDocs = allDocuments.filter(doc => doc.type === 'note');
    this.fuseInstances.notes = new Fuse(noteDocs, this.fuseOptions.notes);

    console.log('SearchService: Fuse.js instances created successfully');
    console.log(`  Main: ${allDocuments.length} docs`);
    console.log(`  Projects: ${projectDocs.length} docs`);
    console.log(`  Files: ${fileDocs.length} docs`);
    console.log(`  People: ${peopleDocs.length} docs`);
    console.log(`  Notes: ${noteDocs.length} docs`);
  }

  /**
   * Clear all indices and document store
   */
  clearIndices() {
    this.documentStore.clear();
    this.resultCache.clear();
    Object.keys(this.fuseInstances).forEach(key => {
      this.fuseInstances[key] = null;
    });
  }

  /**
   * Generate unique document ID
   */
  generateDocumentId(type, identifier, subId = '') {
    const cleanId = `${type}_${identifier}_${subId}`.replace(/[^a-zA-Z0-9_-]/g, '_');
    return cleanId;
  }

  /**
   * Extract and generate tags for content analysis
   */
  generateTags(content, type, extension = '') {
    const tags = new Set();

    // Add type-based tags
    tags.add(type);

    // Add extension-based tags
    if (extension) {
      tags.add(`ext-${extension.replace('.', '')}`);

      // Check for statistical file patterns
      const ext = extension.toLowerCase();
      Object.entries(this.tagPatterns).forEach(([lang, config]) => {
        if (config.extensions && config.extensions.includes(ext)) {
          if (config.tags) {
            config.tags.forEach(tag => tags.add(tag));
          }

          // Check content patterns
          if (content && config.patterns) {
            config.patterns.forEach(pattern => {
              if (content.toLowerCase().includes(pattern.toLowerCase())) {
                tags.add(`pattern-${pattern.replace(/[^a-zA-Z0-9]/g, '-')}`);
              }
            });
          }
        }
      });
    }

    // Content-based tag generation
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
   * Index project metadata
   */
  async indexProjectMetadata(project) {
    const content = this.extractProjectContent(project);
    const tags = this.generateTags(content, 'project');

    const doc = {
      id: this.generateDocumentId('project', project.id),
      type: 'project',
      title: project.name,
      content: content,
      name: project.name,
      description: project.description?.content || project.description?.uriContent || '',
      projectName: project.name,
      projectId: project.id,
      path: project.path,
      categories: (project.categories || []).join(' '),
      tags: tags.join(' '),
      metadata: JSON.stringify({
        id: project.id,
        path: project.path,
        favorite: project.favorite,
        peopleCount: project.people ? project.people.length : 0,
        assetCount: project.assets ? this.countAssets(project.assets) : 0,
        externalAssetCount: project.externalAssets ? this.countAssets(project.externalAssets) : 0,
        noteCount: project.notes ? project.notes.length : 0
      })
    };

    this.documentStore.set(doc.id, { ...doc, item: project });
    return doc;
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
   * Count assets recursively
   */
  countAssets(assets) {
    if (!assets) return 0;

    let count = 1;

    if (assets.children && Array.isArray(assets.children)) {
      count += assets.children.reduce((sum, child) => sum + this.countAssets(child), 0);
    }

    return count;
  }

  /**
   * Beute force indexing 
   */
  async bruteForceIndexAllFiles(project) {
    console.log(`SearchService: Bruteforce indexing: ${project.path}`);

    const indexedDocs = [];
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
              // Skip certain directories 
              if (!['node_modules', '.git', '.statwrap', '__pycache__', '.venv', 'venv'].includes(item)) {
                await scanDirectory(fullPath);
              }
            } else if (stats.isFile()) {
              totalFiles++;

              const extension = path.extname(item).toLowerCase();
              const isTextFile = this.isTextFile(item, extension);

              if (isTextFile) {
                console.log(`SearchService: Indexing file: ${relativePath}`);
                const doc = await this.absoluteForceIndexFile(fullPath, relativePath, project, stats);
                if (doc) {
                  indexedDocs.push(doc);
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

    console.log(`SearchService: 🏁 brute force donee: ${indexedFiles}/${totalFiles} files indexed for ${project.name}`);

    if (indexedFiles === 0) {
      console.error(`SearchService: ❌ 0 files indexef for ${project.name}!`);
    }

    return indexedDocs;
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
        return null;
      }

      // if (content.length === 0) {
      //   console.log(`SearchService: Empty: ${relativePath}`);
      //   content = ''; 
      // }

      const extension = path.extname(relativePath).toLowerCase();
      const filename = path.basename(relativePath);

      // Building the search document
      const searchableContent = `${filename} ${content}`;
      const tags = this.generateTags(content, 'file', extension);

      const doc = {
        id: this.generateDocumentId('file', relativePath),
        type: 'file',
        title: filename,
        content: searchableContent, 
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

      // search map document store
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
      return doc;

    } catch (error) {
      console.error(`SearchService: error!!!!! for ${relativePath}:`, error);
      return null;
    }
  }

  /**
   * Indexing person
   */
  async indexPerson(person, project) {
    if (!person || !person.id) return null;

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
      name: this.formatPersonName(person.name),
      affiliation: person.affiliation || '',
      roles: (person.roles || []).join(' '),
      notes: (person.notes || []).map(note => note.content).join(' '),
      projectName: project.name,
      projectId: project.id,
      tags: tags.join(' '),
      metadata: JSON.stringify({
        id: person.id,
        roleCount: person.roles ? person.roles.length : 0,
        noteCount: person.notes ? person.notes.length : 0
      })
    };

    this.documentStore.set(doc.id, {
      ...doc,
      item: {
        ...person,
        projectName: project.name
      }
    });

    return doc;
  }

  /**
   * Indexing note
   */
  async indexNote(note, project, entityType, entityName) {
    if (!note || !note.content) return null;

    const tags = this.generateTags(note.content, 'note');

    const doc = {
      id: this.generateDocumentId('note', note.id || Date.now(), entityType),
      type: 'note',
      title: `Note: ${entityName}`,
      content: note.content,
      author: note.author || '',
      entityType: entityType,
      entityName: entityName,
      projectName: project.name,
      projectId: project.id,
      tags: tags.join(' '),
      metadata: JSON.stringify({
        noteType: entityType,
        created: note.created,
        updated: note.updated,
        contentLength: note.content.length
      })
    };

    this.documentStore.set(doc.id, {
      ...doc,
      item: {
        ...note,
        noteType: entityType,
        entityName: entityName,
        projectName: project.name
      }
    });

    return doc;
  }

  /**
   * Format person name 
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
   * Perform search across all indexed content using Fuse
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
      const searchResults = this.performFuseSearch(query, options);
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
   * Perform the actual search using Fuse.js
   */
  performFuseSearch(query, options = {}) {
    const {
      type,
      projectId,
      maxResults = SearchConfig?.search?.maxResults || 1000
    } = options;

    let fuseInstance = this.fuseInstances.main;

    // Use specialized Fuse instance if type is specified
    if (type && type !== 'all' && this.fuseInstances[type]) {
      fuseInstance = this.fuseInstances[type];
    }

    if (!fuseInstance) {
      console.warn('SearchService: No Fuse instance available');
      return [];
    }

    // Perform Fuse.js search
    const fuseResults = fuseInstance.search(query);

    // Convert Fuse results to required format
    let results = fuseResults.map(fuseResult => {
      const doc = fuseResult.item;
      const docData = this.documentStore.get(doc.id);

      return {
        score: 1 - fuseResult.score, // Inverting score (Fuse uses lower = better)
        type: doc.type,
        item: docData ? docData.item : doc,
        highlights: this.generateHighlights(doc, fuseResult.matches),
        matches: fuseResult.matches
      };
    }).slice(0, maxResults);

    // Apply additional filters
    if (type && type !== 'all') {
      results = results.filter(result => result.type === type);
    }

    if (projectId && projectId !== 'all') {
      results = results.filter(result =>
        result.item && result.item.projectId === projectId
      );
    }

    // Sorting results by relevance score (higher = better)
    results.sort((a, b) => (b.score || 0) - (a.score || 0));

    return results;
  }

  /**
   * Generate highlights for search results
   */
  generateHighlights(doc, matches) {
    const highlights = {};

    if (matches && matches.length > 0) {
      matches.forEach(match => {
        const key = match.key;
        if (match.indices && match.indices.length > 0) {
          if (!highlights[key]) highlights[key] = [];

          // Extract highlighted text segments
          match.indices.forEach(([start, end]) => {
            const text = match.value || '';
            const snippet = text.substring(Math.max(0, start - 20), Math.min(text.length, end + 20));
            highlights[key].push(snippet);
          });
        }
      });
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
        case 'asset':
        case 'external-asset':
          grouped.assets.push(result);
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
    if (!this.isInitialized) {
      console.warn('SearchService: Service not initialized');
      return this.getEmptyResults();
    }

    // Parse search operators for Fuse.js extended search
    const parsedQuery = this.parseSearchQuery(query);

    return this.search(parsedQuery, options);
  }

  /**
   * Parse search query for Fuse.js extended search syntax
   */
  parseSearchQuery(query) {
    // Convert simple operators to Fuse.js extended search
    let processedQuery = query;

    // Handle quoted phrases - Fuse.js supports this natively with quotes
    // Handle negation with ! prefix
    processedQuery = processedQuery.replace(/-(\w+)/g, '!$1');

    // Handle OR operations with | 
    processedQuery = processedQuery.replace(/\bOR\b/gi, '|');

    return processedQuery;
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

    // Get suggestions from document titles and content
    this.documentStore.forEach((doc) => {
      if (suggestions.size >= maxSuggestions) return;

      // title
      if (doc.title && doc.title.toLowerCase().includes(partialQuery.toLowerCase())) {
        suggestions.add(doc.title);
      }

      // filename
      if (doc.filename && doc.filename.toLowerCase().includes(partialQuery.toLowerCase())) {
        suggestions.add(doc.filename);
      }
    });

    return Array.from(suggestions).slice(0, maxSuggestions);
  }

  /**
   * Reindex all projects with full content
   */
  async reindexAll() {
    console.log('SearchService: Starting complete reindex');

    this.clearIndices();
    this.indexingInProgress = true;

    await this.initialize(this.projectsData);

    this.indexingInProgress = false;
    console.log('SearchService: Complete reindex finished');

    // Log reindexing summary
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

    // Clear current data
    this.clearIndices();

    // Restore document store
    this.documentStore = new Map(indexData.documentStore);

    // Rebuild Fuse instances from document store
    const allDocuments = Array.from(this.documentStore.values());
    this.createFuseInstances(allDocuments);

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
    // Implement LRU eviction if cache is full
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

    // Keep only last 100 search times for memory efficiency
    if (this.performanceStats.searchTimes.length > 100) {
      this.performanceStats.searchTimes = this.performanceStats.searchTimes.slice(-100);
    }

    // Calculate average
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
    this.clearIndices();
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
    console.log(`SearchService: Complete indexing already done for ${project.name}, skipping queue`);
  }

  /**
   * Process the indexing queue
   */
  async processIndexingQueue() {
    if (this.indexingQueue.length === 0) return;

    console.log(`SearchService: Processing ${this.indexingQueue.length} remaining items in queue`);
    this.indexingQueue.length = 0;
    this.indexingInProgress = false;

    console.log('SearchService: Queue cleared - full indexing already completed');
  }
}

const searchServiceInstance = new SearchService();
export default searchServiceInstance;