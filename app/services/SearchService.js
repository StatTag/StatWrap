import FlexSearch from 'flexsearch';
import { ipcRenderer } from 'electron';
import fs from 'fs';
import path from 'path';
import SearchConfig from '../constants/search-config';

class SearchService {
  constructor() {
    this.isInitialized = false;
    this.documentStore = new Map();
    this.projectsData = [];
    this.indexingInProgress = false;
    this.indexingQueue = [];
    
    // FlexSearch indices - multiple indices for different content types
    this.indices = {
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
    
    this.initializeIndices();
  }

  /**
   * Initialize FlexSearch indices with optimized configuration
   */
  initializeIndices() {
    try {
      //  configuration including partial matching and phrase search
      const commonConfig = {
        tokenize: "forward", //for partial matchingg
        resolution: 9,
        depth: 4,
        threshold: 1,
        suggest: true,
        context: true
      };

      this.indices.main = new FlexSearch.Document({
        id: "id",
        ...commonConfig,
        index: [
          {
            field: "title",
            tokenize: "forward",
            optimize: true,
            resolution: 9
          },
          {
            field: "content", 
            tokenize: "forward",
            optimize: true,
            resolution: 9,
            minlength: 1, // Allow single character matches
            threshold: 0  // More lenient threshold
          },
          {
            field: "type",
            tokenize: "forward"
          },
          {
            field: "projectName",
            tokenize: "forward"
          },
          {
            field: "tags",
            tokenize: "forward"
          },
          {
            field: "filename",
            tokenize: "forward",
            resolution: 9
          },
          {
            field: "extension",
            tokenize: "forward"
          },
          {
            field: "author",
            tokenize: "forward"
          }
        ]
      });

      this.indices.projects = new FlexSearch.Document({
        id: "id",
        ...commonConfig,
        index: [
          { field: "name", tokenize: "forward", resolution: 9 },
          { field: "description", tokenize: "forward", resolution: 9 },
          { field: "categories", tokenize: "forward" },
          { field: "path", tokenize: "forward" }
        ]
      });

      this.indices.files = new FlexSearch.Document({
        id: "id",
        ...commonConfig,
        index: [
          { field: "filename", tokenize: "forward", resolution: 9 },
          { field: "content", tokenize: "forward", resolution: 9, minlength: 1, threshold: 0 },
          { field: "extension", tokenize: "forward" },
          { field: "path", tokenize: "forward" },
          { field: "tags", tokenize: "forward" }
        ]
      });

      this.indices.people = new FlexSearch.Document({
        id: "id",
        ...commonConfig,
        index: [
          { field: "name", tokenize: "forward", resolution: 9 },
          { field: "affiliation", tokenize: "forward" },
          { field: "roles", tokenize: "forward" },
          { field: "notes", tokenize: "forward", resolution: 9 }
        ]
      });

      this.indices.notes = new FlexSearch.Document({
        id: "id",
        ...commonConfig,
        index: [
          { field: "content", tokenize: "forward", resolution: 9, minlength: 1, threshold: 0 },
          { field: "author", tokenize: "forward" },
          { field: "type", tokenize: "forward" },
          { field: "entityName", tokenize: "forward" }
        ]
      });

      console.log('SearchService: FlexSearch indices initialized successfully');
    } catch (error) {
      console.error('SearchService: Error initializing indices:', error);
    }
  }

  /**
   * Initialize the service with project data 
   */
  async initialize(projects = []) {
    try {
      console.log('SearchService: Starting initialization with', projects.length, 'projects');
      
      this.projectsData = projects;
      this.clearIndices();
      
      // to allow UI to function
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
        
        // Index asset groups
        if (project.assetGroups && Array.isArray(project.assetGroups)) {
          for (const group of project.assetGroups) {
            await this.indexAssetGroup(group, project);
          }
        }
        
        // Small delay b/w projects
        if (i < projects.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      this.indexingInProgress = false;
      
      console.log('SearchService: Initialization complete');
      console.log('Documents indexed:', this.documentStore.size);
      
      // Log indexing summary
      const stats = this.getSearchStats();
      console.log('SearchService: indexing Summary:');
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
   * Clear all indices and document store
   */
  clearIndices() {
    this.documentStore.clear();
    this.resultCache.clear();
    this.initializeIndices();
  }

  
  async bruteForceIndexAllFiles(project) {
    console.log(`SearchService: Indexing all files in: ${project.path}`);
    
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
    
    console.log(`SearchService: Brute force done: ${indexedFiles}/${totalFiles} files indexed for ${project.name}`);
    
    if (indexedFiles === 0) {
      console.error(`SearchService: 0 files indexef for ${project.name}!`);
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
      console.log(`SearchService: Reading : ${fullPath}`);
      
      let content = '';
      try {
        content = fs.readFileSync(fullPath, 'utf8');
        console.log(`SearchService: Success: ${relativePath} (${content.length} characters)`);
      } catch (readError) {
        console.error(`SearchService: FAILED: ${relativePath} - ${readError.message}`);
        return false;
      }
      
      // if (content.length === 0) {
      //   console.log(`SearchService: 📄 EMPTY FILE: ${relativePath}`);
      //   content = ''; // Still index empty files
      // }
      
      const extension = path.extname(relativePath).toLowerCase();
      const filename = path.basename(relativePath);
      
      // Building the search document
      const searchableContent = `${filename} ${content}`;
      const tags = this.generateTags(content, 'file', extension);
      
      // Create a unique, simple document ID
      const docId = `file_${project.id}_${relativePath.replace(/[^a-zA-Z0-9]/g, '_')}`;
      
      const doc = {
        id: docId,
        type: 'file',
        title: filename,
        content: searchableContent, // File name + content
        filename: filename,
        extension: extension,
        path: relativePath,
        relativePath: relativePath,
        projectName: project.name,
        projectId: project.id,
        tags: tags.join(' '), // FlexSearch expects string, not array
        metadata: JSON.stringify({
          size: stats.size,
          lastModified: stats.mtime,
          isContentIndexed: true, 
          source: 'brute-force',
          contentLength: content.length
        })
      };
      
      // add to indices
      this.addToIndices(doc, ['main', 'files']);
      
      // Add to document store
      this.documentStore.set(docId, { 
        ...doc, 
        item: { 
          uri: relativePath,
          name: filename,
          size: stats.size,
          lastModified: stats.mtime,
          snippet: content.substring(0, 300) + (content.length > 300 ? '...' : ''),
          isContentIndexed: true, 
          projectName: project.name,
          projectId: project.id,
          fullPath: fullPath,
          type: 'file',
          actualContent: content, 
          title: filename,
          extension: extension,
          path: relativePath,
          relativePath: relativePath
        } 
      });
      
      console.log(`SearchService: Indexed: ${relativePath} with ${content.length} chars of content (ID: ${docId})`);
      return true;
      
    } catch (error) {
      console.error(`SearchService: error!!!!! for ${relativePath}:`, error);
      return false;
    }
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
    const docId = this.generateDocumentId('project', project.id);
    
    const doc = {
      id: docId,
      type: 'project',
      title: project.name,
      content: this.extractProjectContent(project),
      name: project.name,
      description: project.description?.content || project.description?.uriContent || '',
      categories: (project.categories || []).join(' '),
      path: project.path,
      projectName: project.name,
      projectId: project.id,
      tags: this.generateTags(this.extractProjectContent(project), 'project').join(' ')
    };

    this.addToIndices(doc, ['main', 'projects']);
    this.documentStore.set(docId, { ...doc, item: project });
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
    const docId = this.generateDocumentId('person', person.id);
    
    const doc = {
      id: docId,
      type: 'person',
      title: this.formatPersonName(person.name),
      content: searchableContent,
      name: this.formatPersonName(person.name),
      affiliation: person.affiliation || '',
      roles: (person.roles || []).join(' '),
      notes: (person.notes || []).map(note => note.content).join(' '),
      projectName: project.name,
      projectId: project.id,
      tags: tags.join(' ')
    };
    
    this.addToIndices(doc, ['main', 'people']);
    this.documentStore.set(docId, { 
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
    const docId = this.generateDocumentId('note', note.id || Date.now(), entityType);
    
    const doc = {
      id: docId,
      type: 'note',
      title: `Note: ${entityName}`,
      content: note.content,
      author: note.author || '',
      entityType: entityType,
      entityName: entityName,
      projectName: project.name,
      projectId: project.id,
      tags: tags.join(' ')
    };
    
    this.addToIndices(doc, ['main', 'notes']);
    this.documentStore.set(docId, { 
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
    const docId = this.generateDocumentId('asset-group', group.id);
    
    const doc = {
      id: docId,
      type: 'asset-group',
      title: group.name,
      content: searchableContent,
      projectName: project.name,
      projectId: project.id,
      tags: tags.join(' ')
    };
    
    this.addToIndices(doc, ['main']);
    this.documentStore.set(docId, { 
      ...doc, 
      item: { 
        ...group, 
        projectName: project.name 
      } 
    });
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
   * Add document to specified indices
   */
  addToIndices(doc, indexNames = ['main']) {
    indexNames.forEach(indexName => {
      if (this.indices[indexName]) {
        try {
          this.indices[indexName].add(doc);
          this.performanceStats.documentsIndexed++;
        } catch (error) {
          console.warn(`SearchService: Error adding document to ${indexName} index:`, error);
        }
      }
    });
  }

  /**
   * Perform search across all indexed content
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
   * Perform the actual search using FlexSearch 
   */
  performSearch(query, options = {}) {
    const {
      type,
      projectId,
      maxResults = SearchConfig?.search?.maxResults || 1000
    } = options;
    
    try {
      console.log('SearchService: Performing FlexSearch for query:', query);
      console.log('SearchService: Document store size:', this.documentStore.size);
      
      let allResults = new Set();
      
      // 1: Exact query search
      const exactResults = this.indices.main.search(query, { limit: maxResults });
      this.processFlexSearchResults(exactResults, allResults);
      
      // 2: Split query into individual terms for partial matching
      const queryTerms = query.toLowerCase().trim().split(/\s+/);
      if (queryTerms.length > 1) {
        for (const term of queryTerms) {
          if (term.length >= 2) { // Only search terms with 2+ characters
            const termResults = this.indices.main.search(term, { limit: maxResults });
            this.processFlexSearchResults(termResults, allResults);
          }
        }
      }
      
      // 3: Try prefix matching for each term
      for (const term of queryTerms) {
        if (term.length >= 2) {
          // Try with wildcard-like partial matching (flex search inbuild)
          const prefixResults = this.indices.main.search(term.substring(0, Math.max(2, term.length - 1)), { limit: maxResults });
          this.processFlexSearchResults(prefixResults, allResults);
        }
      }
      
      console.log(`SearchService: Found ${allResults.size} unique document IDs from enhanced search`);
      
      // Convert Set of IDs to search results
      let searchResults = [];
      allResults.forEach(id => {
        const docData = this.documentStore.get(id);
        if (docData) {
          // Calculate relevance based on how well the content matches
          const relevance = this.calculateRelevance(docData, query, queryTerms);
          
          console.log(`SearchService: Found document for ID ${id}: ${docData.type} (relevance: ${relevance})`);
          searchResults.push({
            id: id,
            score: relevance,
            type: docData.type,
            item: docData.item,
            highlights: this.generateHighlights(docData, query)
          });
        } else {
          console.warn(`SearchService: No document found for ID: ${id}`);
        }
      });
      
      // Sort by relevance score (highest first)
      searchResults.sort((a, b) => b.score - a.score);
      
      console.log(`SearchService: Processed ${searchResults.length} valid results`);
      
      // Apply filters
      if (type && type !== 'all') {
        const beforeFilter = searchResults.length;
        searchResults = searchResults.filter(result => result.type === type);
        console.log(`SearchService: Type filter (${type}) reduced results from ${beforeFilter} to ${searchResults.length}`);
      }
      
      if (projectId && projectId !== 'all') {
        const beforeFilter = searchResults.length;
        searchResults = searchResults.filter(result => 
          result.item && result.item.projectId === projectId
        );
        console.log(`SearchService: Project filter (${projectId}) reduced results from ${beforeFilter} to ${searchResults.length}`);
      }
      
      // Limit results
      searchResults = searchResults.slice(0, maxResults);
      
      console.log(`SearchService: Final search results count: ${searchResults.length}`);
      return searchResults;
      
    } catch (error) {
      console.error('SearchService: Error in performSearch:', error);
      return [];
    }
  }

  /**
   * Process FlexSearch results and add unique IDs to the results set
   */
  processFlexSearchResults(flexSearchResults, resultsSet) {
    if (Array.isArray(flexSearchResults)) {
      flexSearchResults.forEach(fieldResult => {
        if (fieldResult && fieldResult.result && Array.isArray(fieldResult.result)) {
          fieldResult.result.forEach(id => {
            resultsSet.add(id);
          });
        }
      });
    }
  }

  /**
   * Calculate relevance score for a document based on query match
   */
  calculateRelevance(docData, originalQuery, queryTerms) {
    let score = 0;
    const query = originalQuery.toLowerCase();
    const content = (docData.content || '').toLowerCase();
    const title = (docData.title || '').toLowerCase();
    
    // Exact phrase match in content gets highest score
    if (content.includes(query)) {
      score += 100;
    }
    
    // Exact phrase match in title gets very high score  
    if (title.includes(query)) {
      score += 90;
    }
    
    // Individual word matches in content
    let wordMatches = 0;
    queryTerms.forEach(term => {
      if (content.includes(term.toLowerCase())) {
        wordMatches++;
        score += 20;
      }
      if (title.includes(term.toLowerCase())) {
        wordMatches++;
        score += 15;
      }
    });// thes scores can be changed
    
    // Bonus for matching all query terms
    if (wordMatches >= queryTerms.length) {
      score += 30;
    }
    
    // Partial word matches (for "play" matching "playing")
    queryTerms.forEach(term => {
      if (term.length >= 3) {
        const partialRegex = new RegExp(term.substring(0, term.length - 1), 'i');
        if (partialRegex.test(content)) {
          score += 10;
        }
        if (partialRegex.test(title)) {
          score += 8;
        }
      }
    });
    
    // File type bonus for text content
    if (docData.type === 'file' && docData.item && docData.item.isContentIndexed) {
      score += 5;
    }
    
    // Normalize score to 0-1 range
    return Math.min(score / 100, 1.0);
  }

  /**
   * Generate highlights for search results
   */
  generateHighlights(docData, query) {
    const highlights = {};
    
    // Simple highlight generation
    if (docData.content && query) {
      const content = docData.content;
      const queryTerms = query.toLowerCase().split(/\s+/);
      
      for (const term of queryTerms) {
        if (term.length > 2 && content.toLowerCase().includes(term)) {
          const index = content.toLowerCase().indexOf(term);
          if (index !== -1) {
            const start = Math.max(0, index - 50);
            const end = Math.min(content.length, index + term.length + 50);
            highlights.content = [content.substring(start, end)];
            break;
          }
        }
      }
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
          // Handle unknown types
          break;
      }
    });
    
    return grouped;
  }

  /**
   * Advanced search with enhanced features
   */
  advancedSearch(query, options = {}) {
    // For FlexSearch, we'll use the same search but with different options
    return this.search(query, { ...options, suggest: true });
  }

  /**
   * Get search suggestions based on partial query
   */
  getSuggestions(partialQuery) {
    if (!this.isInitialized || !partialQuery || partialQuery.length < 2) {
      return [];
    }
    
    try {
      const suggestions = new Set();
      const maxSuggestions = SearchConfig?.ui?.maxSuggestions || 8;
      
      // Use FlexSearch suggest
      const suggestResults = this.indices.main.search(partialQuery, {
        limit: maxSuggestions
      });
      
      // Extract suggestions from results
      if (Array.isArray(suggestResults)) {
        suggestResults.forEach(fieldResult => {
          if (fieldResult.result) {
            fieldResult.result.slice(0, maxSuggestions).forEach(id => {
              const docData = this.documentStore.get(id);
              if (docData && docData.title) {
                suggestions.add(docData.title);
              }
            });
          }
        });
      }
      
      return Array.from(suggestions).slice(0, maxSuggestions);
    } catch (error) {
      console.error('SearchService: Error getting suggestions:', error);
      return [];
    }
  }

  /**
   * Reindex all projects with full content
   */
  async reindexAll() {
    console.log('SearchService: Starting complete reindex');
    
    this.clearIndices();
    this.indexingQueue.length = 0;
    this.indexingInProgress = true;
    
    for (const project of this.projectsData) {
      await this.indexProjectMetadata(project);
      if (project.path && fs.existsSync(project.path)) {
        await this.bruteForceIndexAllFiles(project);
      }
      // Index other project components...
    }
    
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
    const exportData = {
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
    
    // **** FlexSearch indices cannot be easily serialized
    // Users will need to reindex after import
    return exportData;
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
    
    // Rebuild FlexSearch indices from document store
    this.documentStore.forEach(doc => {
      const indexNames = this.getIndexNamesForType(doc.type);
      this.addToIndices(doc, indexNames);
    });
    
    // Restore performance stats
    if (indexData.performanceStats) {
      this.performanceStats = { ...this.performanceStats, ...indexData.performanceStats };
    }
    
    console.log('SearchService: Index import completed');
  }

  /**
   * Get appropriate index names for a document type
   */
  getIndexNamesForType(type) {
    const indexMap = {
      'project': ['main', 'projects'],
      'file': ['main', 'files'],
      'folder': ['main', 'files'],
      'person': ['main', 'people'],
      'note': ['main', 'notes'],
      'asset': ['main'],
      'external-asset': ['main'],
      'asset-group': ['main']
    };
    
    return indexMap[type] || ['main'];
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
   * Debug method to check document store
   */
  debugDocumentStore() {
    console.log('SearchService DEBUG: Document Store Contents:');
    console.log('  Total documents:', this.documentStore.size);
    
    const typeCount = {};
    this.documentStore.forEach((doc, id) => {
      typeCount[doc.type] = (typeCount[doc.type] || 0) + 1;
      console.log(`  ${id}: ${doc.type} - "${doc.title || doc.item?.name || 'No title'}"`);
    });
    
    console.log('Documents by type:', typeCount);
    
    // Test a simple search
    const testQuery = 'py';
    console.log(`Testing search for "${testQuery}":`);
    const testResults = this.indices.main.search(testQuery);
    console.log('Raw FlexSearch results:', testResults);
    
    return {
      totalDocs: this.documentStore.size,
      typeCount,
      testQuery,
      testResults
    };
  }
}

const searchServiceInstance = new SearchService();
export default searchServiceInstance;