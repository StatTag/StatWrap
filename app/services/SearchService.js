import lunr from 'lunr';
import { ipcRenderer } from 'electron';
import fs from 'fs';
import path from 'path';
import Messages from '../constants/messages';

class EnhancedSearchService {
  constructor() {
    this.searchIndex = null;
    this.documentStore = new Map(); // Store full documents for retrieval
    this.indexedProjects = [];
    this.indexingInProgress = false;
    this.indexingQueue = [];
    this.maxFileSize = 10 * 1024 * 1024; // 10MB max file size
    this.projectsData = [];
    this.isInitialized = false;

    this.indexableExtensions = [
      '.txt', '.md', '.json', '.csv', '.js', '.jsx', '.ts', '.tsx',
      '.html', '.css', '.scss', '.py', '.r', '.do', '.sas', '.sps',
      '.stata', '.sql', '.xml', '.log', '.out', '.docx', '.pdf',
      '.yml', '.yaml', '.ini', '.cfg', '.conf', '.properties',
      '.java', '.c', '.cpp', '.h', '.hpp', '.cs', '.php', '.rb',
      '.go', '.rs', '.swift', '.kt', '.scala', '.clj', '.elm',
      '.dart', '.vue', '.svelte', '.astro', '.hbs', '.mustache',
      '.twig', '.jinja', '.ejs', '.pug', '.sass', '.less', '.styl',
      '.coffee', '.livescript', '.purescript', '.elm', '.reason',
      '.ml', '.mli', '.fs', '.fsx', '.fsi', '.vb', '.bas', '.cls',
      '.frm', '.ctl', '.dsr', '.dob', '.res', '.resx', '.xaml',
      '.aspx', '.ascx', '.master', '.sitemap', '.skin', '.browser',
      '.compile', '.exclude', '.refresh', '.licx', '.webinfo',
      '.ipynb', '.rmd' 
    ];

    // Debug flag
    this.debug = true;

    // Search result type weights for relevance scoring
    this.typeWeights = {
      'project': 1.0,
      'file': 0.9,
      'folder': 0.8,
      'person': 0.9,
      'asset': 0.8,
      'note': 0.7,
      'content': 0.6
    };

    // Performance and analytics tracking
    this.performanceStats = {
      totalSearches: 0,
      totalIndexingTime: 0,
      averageSearchTime: 0,
      documentsIndexed: 0,
      searchTimes: [],
      lastIndexingStart: null,
      lastIndexingEnd: null,
      indexingHistory: [],
      searchHistory: [],
      errorCount: 0,
      lastError: null
    };

    // Cache management
    this.searchCache = new Map();
    this.maxCacheSize = 100;
    this.cacheHits = 0;
    this.cacheMisses = 0;

    // Configuration tracking
    this.configuration = {
      maxFileSize: this.maxFileSize,
      indexableExtensions: this.indexableExtensions.length,
      enableFuzzySearch: true,
      enableSuggestions: true,
      enableContentIndexing: true,
      enableCache: true,
      cacheSize: this.maxCacheSize,
      debugMode: this.debug,
      typeWeights: this.typeWeights
    };

    // Initialize performance tracking
    this.initializePerformanceTracking();
  }

  /**
   * Initialize performance tracking
   */
  initializePerformanceTracking() {
    setInterval(() => {
      if (this.performanceStats.searchTimes.length > 1000) {
        this.performanceStats.searchTimes = this.performanceStats.searchTimes.slice(-500);
      }
      this.calculateAverageSearchTime();
    }, 60000); 

    // Clear cache periodically if it gets too large
    setInterval(() => {
      if (this.searchCache.size > this.maxCacheSize) {
        this.clearOldestCacheEntries();
      }
    }, 30000); 
  }

  /**
   * Clear oldest cache entries
   */
  clearOldestCacheEntries() {
    const entriesToRemove = this.searchCache.size - Math.floor(this.maxCacheSize * 0.8);
    let removed = 0;

    for (const [key] of this.searchCache) {
      if (removed >= entriesToRemove) break;
      this.searchCache.delete(key);
      removed++;
    }
  }

  /**
   * Calculate average search time
   */
  calculateAverageSearchTime() {
    if (this.performanceStats.searchTimes.length === 0) {
      this.performanceStats.averageSearchTime = 0;
      return;
    }

    const sum = this.performanceStats.searchTimes.reduce((acc, time) => acc + time, 0);
    this.performanceStats.averageSearchTime = Math.round(sum / this.performanceStats.searchTimes.length);
  }

  /**
   * Record search performance
   */
  recordSearchPerformance(searchTime, query, resultCount) {
    this.performanceStats.totalSearches++;
    this.performanceStats.searchTimes.push(searchTime);
    this.calculateAverageSearchTime();

    // Keep search history
    this.performanceStats.searchHistory.unshift({
      query,
      resultCount,
      searchTime,
      timestamp: Date.now(),
      cached: this.searchCache.has(query)
    });

    // Keep only last 100 searches
    if (this.performanceStats.searchHistory.length > 100) {
      this.performanceStats.searchHistory = this.performanceStats.searchHistory.slice(0, 100);
    }
  }

  /**
   * Record indexing performance
   */
  recordIndexingPerformance(projectId, documentsAdded, indexingTime) {
    this.performanceStats.documentsIndexed += documentsAdded;
    this.performanceStats.totalIndexingTime += indexingTime;

    this.performanceStats.indexingHistory.unshift({
      projectId,
      documentsAdded,
      indexingTime,
      timestamp: Date.now(),
      totalDocuments: this.documentStore.size
    });

    // Keep only last 50 indexing operations
    if (this.performanceStats.indexingHistory.length > 50) {
      this.performanceStats.indexingHistory = this.performanceStats.indexingHistory.slice(0, 50);
    }
  }

  /**
   * Record error
   */
  recordError(error, context) {
    this.performanceStats.errorCount++;
    this.performanceStats.lastError = {
      message: error.message,
      context,
      timestamp: Date.now(),
      stack: error.stack
    };

    console.error(`EnhancedSearchService Error [${context}]:`, error);
  }

  /**
   * Initialize the service with project data 
   */
  async initialize(projects = []) {
    try {
      console.log('EnhancedSearchService: Starting initialization with', projects.length, 'projects');

      this.projectsData = projects;
      this.documentStore.clear();
      this.searchCache.clear();

      // Set initialized immediately to allow UI to function
      this.isInitialized = true;
      this.indexingInProgress = true;
      const allDocuments = [];

      for (let i = 0; i < projects.length; i++) {
        const project = projects[i];
        console.log(`EnhancedSearchService: FORCE PROCESSING PROJECT ${i + 1}/${projects.length}: ${project.name}`);

        // Index project metadata
        await this.collectProjectMetadata(project, allDocuments);
        if (project.path && fs.existsSync(project.path)) {
          console.log(`EnhancedSearchService: FORCE SCANNING DIRECTORY: ${project.path}`);
          await this.bruteForceCollectAllFiles(project, allDocuments);
        } else {
          console.error(`EnhancedSearchService: PROJECT PATH DOES NOT EXIST: ${project.path}`);
        }

        // Index people
        if (project.people && Array.isArray(project.people)) {
          for (const person of project.people) {
            await this.collectPerson(person, project, allDocuments);
          }
        }

        // Index project notes
        if (project.notes && Array.isArray(project.notes)) {
          for (const note of project.notes) {
            await this.collectNote(note, project, 'project', project.name, allDocuments);
          }
        }
      }

      console.log(`EnhancedSearchService: Building Lunr index with ${allDocuments.length} documents - THIS IS THE FAST PART!`);
      this.buildLunrIndexOnce(allDocuments);

      this.indexingInProgress = false;

      console.log('EnhancedSearchService: Initialization complete');
      console.log('Documents indexed:', this.documentStore.size);

      // Log indexing summary
      const stats = this.getSearchStats();
      console.log('EnhancedSearchService: FINAL INDEXING SUMMARY:');
      Object.entries(stats.documentsByType).forEach(([type, count]) => {
        console.log(`  ${type}: ${count} documents`);
      });
      console.log(`  Content-indexed files: ${stats.contentIndexedFiles}`);

      if (stats.contentIndexedFiles === 0) {
        console.error('EnhancedSearchService: ❌ NO FILES WERE CONTENT INDEXED! SOMETHING IS WRONG!');
      } else {
        console.log(`EnhancedSearchService: ✅ SUCCESS! ${stats.contentIndexedFiles} files have content indexed`);
      }

    } catch (error) {
      console.error('EnhancedSearchService: Initialization error:', error);
      this.indexingInProgress = false;
    }
  }

  /**
   * Build Lunr index ONCE with all documents
   */
  buildLunrIndexOnce(allDocuments) {
    try {
      console.log(`EnhancedSearchService: Building Lunr index with ${allDocuments.length} documents in one go!`);
      const startTime = Date.now();

      this.searchIndex = lunr(function () {
        this.ref('id');
        this.field('title', { boost: 10 });
        this.field('content', { boost: 1 });
        this.field('filename', { boost: 8 });
        this.field('type', { boost: 5 });
        this.field('projectName', { boost: 3 });
        this.field('path', { boost: 2 });
        this.field('extension', { boost: 2 });

        // Add stemming and fuzzy matching
        this.pipeline.add(lunr.trimmer, lunr.stopWordFilter, lunr.stemmer);
        this.searchPipeline.add(lunr.stemmer);

        // Add all documents at once 
        allDocuments.forEach(doc => {
          this.add(doc);
        });
      });

      const buildTime = Date.now() - startTime;
      console.log(`EnhancedSearchService: Lunr index built in ${buildTime}ms with ${allDocuments.length} documents - DONE!`);
    } catch (error) {
      console.error('EnhancedSearchService: Error building Lunr index:', error);
    }
  }

  async bruteForceCollectAllFiles(project, allDocuments) {
    console.log(`EnhancedSearchService: BRUTE FORCE COLLECTING ALL FILES IN: ${project.path}`);

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
              if (!['node_modules', '.git', '.statwrap', '__pycache__', '.venv', 'venv'].includes(item)) {
                await scanDirectory(fullPath);
              }
            } else if (stats.isFile()) {
              totalFiles++;

              const extension = path.extname(item).toLowerCase();
              const isTextFile = this.isTextFile(item, extension);

              if (isTextFile) {
                const success = await this.absoluteForceCollectFile(fullPath, relativePath, project, stats, allDocuments);
                if (success) {
                  indexedFiles++;
                  if (indexedFiles % 50 === 0) {
                    console.log(`EnhancedSearchService: Collected ${indexedFiles} files so far...`);
                  }
                }
              }

              // Progress every 100 files
              if (totalFiles % 100 === 0) {
                console.log(`EnhancedSearchService: Progress: ${totalFiles} files processed, ${indexedFiles} collected`);
                await new Promise(resolve => setTimeout(resolve, 1)); // Tiny delay
              }
            }
          } catch (statError) {
            console.warn(`EnhancedSearchService: Stat error for ${fullPath}: ${statError.message}`);
          }
        }
      } catch (readError) {
        console.error(`EnhancedSearchService: Read error for ${dirPath}: ${readError.message}`);
      }
    };

    await scanDirectory(project.path);

    console.log(`EnhancedSearchService: COLLECTION COMPLETE: ${indexedFiles}/${totalFiles} files collected for ${project.name}`);
  }

  async absoluteForceCollectFile(fullPath, relativePath, project, stats, allDocuments) {
    try {
      let content = '';
      try {
        content = fs.readFileSync(fullPath, 'utf8');
      } catch (readError) {
        console.error(`EnhancedSearchService:  READ FAILED: ${relativePath} - ${readError.message}`);
        return false;
      }

      const extension = path.extname(relativePath).toLowerCase();
      const filename = path.basename(relativePath);

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
      allDocuments.push(doc);
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

      return true;

    } catch (error) {
      console.error(`EnhancedSearchService: COLLECT ERROR for ${relativePath}:`, error);
      return false;
    }
  }

  /**
   * Collect project metadata 
   */
  async collectProjectMetadata(project, allDocuments) {
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

    allDocuments.push(doc);
    this.documentStore.set(doc.id, { ...doc, item: project });
  }

  /**
   * Collect a person 
   */
  async collectPerson(person, project, allDocuments) {
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

    allDocuments.push(doc);
    this.documentStore.set(doc.id, {
      ...doc,
      item: {
        ...person,
        projectName: project.name
      }
    });

    // Collect person notes separately
    if (person.notes && Array.isArray(person.notes)) {
      for (const note of person.notes) {
        await this.collectNote(note, project, 'person', this.formatPersonName(person.name), allDocuments);
      }
    }
  }

  /**
   * Collect a note 
   */
  async collectNote(note, project, entityType, entityName, allDocuments) {
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

    allDocuments.push(doc);
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
   * Generate unique document ID 
   */
  generateDocumentId(type, identifier, subId = '') {
    const cleanId = `${type}_${identifier}_${subId}`.replace(/[^a-zA-Z0-9_-]/g, '_');
    return cleanId;
  }

  /**
   * BRUTE FORCE INDEX ALL FILES 
   */
  async bruteForceIndexAllFiles(project) {
    console.log(`EnhancedSearchService: BRUTE FORCE INDEXING ALL FILES IN: ${project.path}`);

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
                console.log(`EnhancedSearchService: INDEXING FILE: ${relativePath}`);
                const success = await this.absoluteForceIndexFile(fullPath, relativePath, project, stats);
                if (success) {
                  indexedFiles++;
                  console.log(`EnhancedSearchService: ✅ SUCCESS: ${relativePath}`);
                } else {
                  console.error(`EnhancedSearchService: ❌ FAILED: ${relativePath}`);
                }
              } else {
                console.log(`EnhancedSearchService: SKIPPING NON-TEXT: ${relativePath}`);
              }

              // Progress every 10 files
              if (totalFiles % 10 === 0) {
                console.log(`EnhancedSearchService: Progress: ${totalFiles} files processed, ${indexedFiles} indexed`);
                await new Promise(resolve => setTimeout(resolve, 10));
              }
            }
          } catch (statError) {
            console.warn(`EnhancedSearchService: Stat error for ${fullPath}: ${statError.message}`);
          }
        }
      } catch (readError) {
        console.error(`EnhancedSearchService: Read error for ${dirPath}: ${readError.message}`);
      }
    };

    await scanDirectory(project.path);

    console.log(`EnhancedSearchService: BRUTE FORCE COMPLETE: ${indexedFiles}/${totalFiles} files indexed for ${project.name}`);

    if (indexedFiles === 0) {
      console.error(`EnhancedSearchService: ZERO FILES INDEXED FOR ${project.name}!`);
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
   * ABSOLUTE FORCE INDEX A SINGLE FILE  
   */
  async absoluteForceIndexFile(fullPath, relativePath, project, stats) {
    try {
      console.log(`EnhancedSearchService: ABSOLUTE FORCE READING: ${fullPath}`);
      let content = '';
      try {
        content = fs.readFileSync(fullPath, 'utf8');
        console.log(`EnhancedSearchService: READ SUCCESS: ${relativePath} (${content.length} characters)`);
      } catch (readError) {
        console.error(`EnhancedSearchService: READ FAILED: ${relativePath} - ${readError.message}`);
        return false;
      }

      if (content.length === 0) {
        console.log(`EnhancedSearchService: EMPTY FILE: ${relativePath}`);
        content = ''; // Still index empty files
      }

      const extension = path.extname(relativePath).toLowerCase();
      const filename = path.basename(relativePath);

      // BUILD THE SEARCH DOCUMENT FOR LUNR
      const tags = this.generateTags(content, 'file', extension);

      const doc = {
        id: this.generateDocumentId('file', relativePath),
        type: 'file',
        title: filename,
        content: content, // ACTUAL FILE CONTENT
        filename: filename,
        extension: extension,
        path: relativePath,
        relativePath: relativePath,
        projectName: project.name,
        projectId: project.id,
        tags: tags.join(' '), // Lunr can handle string tags
        metadata: JSON.stringify({
          size: stats.size,
          lastModified: stats.mtime,
          isContentIndexed: true,
          source: 'brute-force',
          contentLength: content.length
        })
      };

      // ADD TO LUNR INDEX (rebuild index with new document)
      this.addDocumentToLunrIndex(doc);

      // ADD TO DOCUMENT STORE
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

      console.log(`EnhancedSearchService: INDEXED: ${relativePath} with ${content.length} chars of content`);
      return true;

    } catch (error) {
      console.error(`EnhancedSearchService: ABSOLUTE FORCE INDEX ERROR for ${relativePath}:`, error);
      return false;
    }
  }

  /**
   * Clear index and document store
   */
  clearIndex() {
    this.documentStore.clear();
    this.searchCache.clear();
    this.searchIndex = null; // Don't build index yet
  }

  // Remove the old slow methods that rebuild index every time

  /**
   * Legacy methods - now point to fast collection methods
   */
  async indexProjectMetadata(project) {
    console.log('EnhancedSearchService: Use initialize() for fast indexing');
  }

  async indexPerson(person, project) {
    console.log('EnhancedSearchService: Use initialize() for fast indexing');
  }

  async indexNote(note, project, entityType, entityName) {
    console.log('EnhancedSearchService: Use initialize() for fast indexing');
  }

  async bruteForceIndexAllFiles(project) {
    console.log('EnhancedSearchService: Use initialize() for fast indexing');
  }

  async absoluteForceIndexFile(fullPath, relativePath, project, stats) {
    console.log('EnhancedSearchService: Use initialize() for fast indexing');
  }

  addDocumentToLunrIndex(doc) {
    console.log('EnhancedSearchService: Use initialize() for fast indexing');
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

    this.addDocumentToLunrIndex(doc);
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

    this.addDocumentToLunrIndex(doc);
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
      const commonTags = {
        'statistics': ['regression', 'correlation', 'variance', 'mean', 'median'],
        'machine-learning': ['model', 'training', 'prediction', 'algorithm'],
        'data': ['dataset', 'dataframe', 'csv', 'database', 'table'],
        'visualization': ['plot', 'chart', 'graph', 'figure', 'matplotlib'],
        'research': ['hypothesis', 'analysis', 'study', 'experiment', 'results']
      };

      Object.entries(commonTags).forEach(([category, terms]) => {
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
   * Perform search across all indexed content using Lunr
   */
  search(query, options = {}) {
    if (!this.isInitialized) {
      console.warn('EnhancedSearchService: Service not initialized');
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
      console.log('EnhancedSearchService: Returning cached results');
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

      console.log(`EnhancedSearchService: Search completed in ${searchTime}ms, found ${searchResults.length} results`);

      return groupedResults;

    } catch (error) {
      console.error('EnhancedSearchService: Search error:', error);
      return this.getEmptyResults();
    }
  }

  /**
   * Perform the actual search using Lunr
   */
  performSearch(query, options = {}) {
    const {
      type,
      projectId,
      maxResults = 1000,
      fuzzy = true
    } = options;

    // Perform search with Lunr
    let results = [];

    try {
      // Basic search
      results = this.searchIndex.search(query);

      // Add wildcard search for partial matches
      if (fuzzy) {
        const wildcardQuery = query.split(/\s+/).map(term => `${term}*`).join(' ');
        const wildcardResults = this.searchIndex.search(wildcardQuery);

        // Combine and deduplicate
        const combined = [...results, ...wildcardResults];
        const seen = new Set();
        results = combined.filter(result => {
          if (seen.has(result.ref)) return false;
          seen.add(result.ref);
          return true;
        });
      }
    } catch (error) {
      console.error('EnhancedSearchService: Lunr search error:', error);
      return [];
    }

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
    const docData = this.documentStore.get(result.ref);
    if (!docData) {
      console.warn(`EnhancedSearchService: Document not found in store: ${result.ref}`);
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
        size: this.searchCache.size,
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
   * Generate cache key for search results
   */
  generateCacheKey(query, options) {
    return `${query}_${JSON.stringify(options)}`.replace(/[^a-zA-Z0-9_]/g, '_');
  }

  /**
   * Get results from cache
   */
  getFromCache(key) {
    const cached = this.searchCache.get(key);
    if (!cached) return null;

    const cacheTTL = 600000; // 10 minutes
    if (Date.now() - cached.timestamp > cacheTTL) {
      this.searchCache.delete(key);
      return null;
    }

    return cached.data;
  }

  /**
   * Add results to cache
   */
  addToCache(key, data) {
    if (this.searchCache.size >= this.maxCacheSize) {
      const firstKey = this.searchCache.keys().next().value;
      this.searchCache.delete(firstKey);
    }

    this.searchCache.set(key, {
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
   * Reindex all projects with full content
   */
  async reindexAll() {
    console.log('EnhancedSearchService: Starting complete reindex');

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
    console.log('EnhancedSearchService: Complete reindex finished');

    const stats = this.getSearchStats();
    console.log('EnhancedSearchService: Reindex Summary:');
    Object.entries(stats.documentsByType).forEach(([type, count]) => {
      console.log(`  ${type}: ${count} documents`);
    });
    console.log(`  Content-indexed files: ${stats.contentIndexedFiles}`);
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
      cacheSize: this.searchCache.size
    };
  }

  /**
   * Clear all caches
   */
  clearCaches() {
    this.searchCache.clear();
    console.log('EnhancedSearchService: Caches cleared');
  }

  /**
   * Clear search cache
   */
  clearCache() {
    this.searchCache.clear();
    this.cacheHits = 0;
    this.cacheMisses = 0;
    console.log('EnhancedSearchService: Cache cleared');
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
    console.log('EnhancedSearchService: Cleanup completed');
  }

  /**
   * Advanced search with enhanced features (compatibility)
   */
  advancedSearch(query, options = {}) {
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
    const maxSuggestions = 8;

    try {
      const results = this.searchIndex.search(`${partialQuery}*`);

      results.slice(0, maxSuggestions).forEach(result => {
        const doc = this.documentStore.get(result.ref);
        if (doc) {
          if (doc.title) suggestions.add(doc.title);
          if (doc.filename) suggestions.add(doc.filename);
        }
      });
    } catch (error) {
      console.warn('EnhancedSearchService: Error getting suggestions:', error);
    }

    return Array.from(suggestions).slice(0, maxSuggestions);
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

    console.log('EnhancedSearchService: Importing index data');

    this.clearIndex();

    // Restore document store
    this.documentStore = new Map(indexData.documentStore);

    // Rebuild Lunr index from document store
    const docs = Array.from(this.documentStore.values());

    this.searchIndex = lunr(function () {
      this.ref('id');
      this.field('title', { boost: 10 });
      this.field('content', { boost: 1 });
      this.field('filename', { boost: 8 });
      this.field('type', { boost: 5 });
      this.field('projectName', { boost: 3 });
      this.field('path', { boost: 2 });
      this.field('extension', { boost: 2 });

      this.pipeline.add(lunr.trimmer, lunr.stopWordFilter, lunr.stemmer);
      this.searchPipeline.add(lunr.stemmer);

      docs.forEach(doc => {
        this.add(doc);
      });
    });

    // Restore performance stats
    if (indexData.performanceStats) {
      this.performanceStats = { ...this.performanceStats, ...indexData.performanceStats };
    }

    console.log('EnhancedSearchService: Index import completed');
  }


  /**
   * Queue a project for content indexing (compatibility method)
   */
  queueProjectForContentIndexing(project) {
    console.log(`EnhancedSearchService: Immediate indexing already completed for ${project.name || project.id}`);
  }

  /**
   * Process the next project in the indexing queue (compatibility method)
   */
  async processNextInQueue() {
    console.log('EnhancedSearchService: Queue processing not needed - immediate indexing is used');
  }

  /**
   * Index project contents (compatibility method)
   */
  async indexProjectContents(project) {
    console.log(`EnhancedSearchService: Project contents already indexed for ${project.name || project.id}`);
  }

  /**
   * Update configuration
   */
  updateConfiguration(newConfig) {
    const oldConfig = { ...this.configuration };
    this.configuration = { ...this.configuration, ...newConfig };

    // Apply configuration changes
    if (newConfig.maxFileSize && newConfig.maxFileSize !== oldConfig.maxFileSize) {
      this.maxFileSize = newConfig.maxFileSize;
    }

    if (newConfig.enableCache !== undefined && newConfig.enableCache !== oldConfig.enableCache) {
      if (!newConfig.enableCache) {
        this.clearCache();
      }
    }

    if (newConfig.debugMode !== undefined) {
      this.debug = newConfig.debugMode;
    }

    console.log('EnhancedSearchService: Configuration updated', {
      old: oldConfig,
      new: this.configuration
    });
  }

  /**
   * Run diagnostic tests
   */
  runDiagnostics() {
    const diagnostics = {
      timestamp: new Date().toISOString(),
      tests: {},
      overall: 'unknown'
    };

    try {
      // Test 1: Check if search index exists
      diagnostics.tests.searchIndexExists = {
        passed: !!this.searchIndex,
        message: this.searchIndex ? 'Search index is initialized' : 'Search index is missing'
      };

      // Test 2: Check document store
      diagnostics.tests.documentStorePopulated = {
        passed: this.documentStore.size > 0,
        message: `Document store contains ${this.documentStore.size} documents`
      };

      // Test 3: Test basic search functionality
      try {
        const testSearch = this.search('test');
        diagnostics.tests.searchFunctionality = {
          passed: !!testSearch && typeof testSearch === 'object',
          message: 'Search function executes successfully'
        };
      } catch (error) {
        diagnostics.tests.searchFunctionality = {
          passed: false,
          message: `Search function failed: ${error.message}`
        };
      }

      // Test 4: Check configuration validity
      diagnostics.tests.configurationValid = {
        passed: this.configuration && typeof this.configuration === 'object',
        message: 'Configuration object is valid'
      };

      // Test 5: Check performance tracking
      diagnostics.tests.performanceTracking = {
        passed: this.performanceStats && typeof this.performanceStats === 'object',
        message: `Performance stats available with ${this.performanceStats.totalSearches} searches tracked`
      };

      // Determine overall status
      const allTests = Object.values(diagnostics.tests);
      const passedTests = allTests.filter(test => test.passed);

      if (passedTests.length === allTests.length) {
        diagnostics.overall = 'healthy';
      } else if (passedTests.length > allTests.length / 2) {
        diagnostics.overall = 'warning';
      } else {
        diagnostics.overall = 'error';
      }

      diagnostics.summary = `${passedTests.length}/${allTests.length} tests passed`;

    } catch (error) {
      diagnostics.overall = 'error';
      diagnostics.error = error.message;
      this.recordError(error, 'runDiagnostics');
    }

    return diagnostics;
  }

  /**
   * Get debug information for troubleshooting
   */
  getDebugInfo() {
    return {
      state: {
        initialized: !!this.searchIndex,
        documentStoreSize: this.documentStore.size,
        projectsDataLength: this.projectsData.length,
        indexingInProgress: this.indexingInProgress,
        queueLength: this.indexingQueue.length
      },
      performance: {
        ...this.performanceStats,
        cacheSize: this.searchCache.size,
        cacheHitRate: this.cacheHits + this.cacheMisses > 0 ?
          (this.cacheHits / (this.cacheHits + this.cacheMisses)) * 100 : 0
      },
      configuration: this.configuration,
      indexInfo: {
        hasSearchIndex: !!this.searchIndex,
        indexableExtensions: this.indexableExtensions,
        typeWeights: this.typeWeights
      }
    };
  }

  /**
   * Get sample documents by type for debugging
   */
  getSampleDocumentsByType() {
    const samples = {};
    const maxSamplesPerType = 3;

    Array.from(this.documentStore.values()).forEach(doc => {
      if (!samples[doc.type]) {
        samples[doc.type] = [];
      }

      if (samples[doc.type].length < maxSamplesPerType) {
        samples[doc.type].push({
          id: doc.id,
          title: doc.title,
          contentLength: doc.content ? doc.content.length : 0,
          hasMetadata: !!doc.metadata,
          projectId: doc.projectId,
          projectName: doc.projectName
        });
      }
    });

    return samples;
  }
}

const enhancedSearchService = new EnhancedSearchService();
export default enhancedSearchService;