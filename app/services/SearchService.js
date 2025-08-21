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
    this.maxIndexingFileSize = 0.1 * 1024 * 1024 
    this.previousMaxFileSize = null; // Tracking file size changes
    this.isRestoring = false; 
    this.indicesBuiltThisSession = false;

    // Index file path 
    this.indexFilePath = null;
    this.indexedProjectsMap = new Map(); 
    
    // FlexSearch indices 
    this.indices = {
      main: null,
      projects: null,
      files: null,
      people: null,
      notes: null
    };
    this.initializeScoringConfig(SearchConfig?.scoring || {});
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
    this.initializeIndices();
    this.setupIndexFilePath();
  }

  /**
   * Setup the index file path in app data directory
   */
  async setupIndexFilePath() {
    try {
      const appDataPath = await ipcRenderer.invoke('get-app-data-path');
      const searchDataDir = path.join(appDataPath, 'search');
      
      // Create directory if it doesn't exist
      if (!fs.existsSync(searchDataDir)) {
        fs.mkdirSync(searchDataDir, { recursive: true });
      }
      
      this.indexFilePath = path.join(searchDataDir, 'search-index.json');
      console.log('SearchService: Index file path set to:', this.indexFilePath);
    } catch (error) {
      console.error('SearchService: Error setting up index file path:', error);
      // Falling back to current directory
      this.indexFilePath = path.join(process.cwd(), 'search-index.json');
    }
  }

  initializeIndices() {
    try {
      const commonConfig = {
        tokenize: "strict",
        resolution: 9,
        depth: 4,
        threshold: 1,
        suggest: true,
        context: true
      };

      this.indices.main = new FlexSearch.Document({
        id: "id",
        tag: "score",
        ...commonConfig,
        index: [
          {
            field: "title",
            tokenize: "strict",
            optimize: true,
            resolution: 9,
            context: { 
            resolution: SearchConfig?.search?.resolution || 5,
            depth: SearchConfig?.search?.depth || 3,
            bidirectional: true
            }
          },
          {
            field: "content", 
            tokenize: "strict",
            optimize: true,
            resolution: 9,
            minlength: 1,
            threshold: 0,
            context: { 
            resolution: SearchConfig?.search?.resolution || 5,
            depth: SearchConfig?.search?.depth || 3,
            bidirectional: true
            }
          },
          {
            field: "type",
            tokenize: "strict",
            context: { 
            resolution: SearchConfig?.search?.resolution || 5,
            depth: SearchConfig?.search?.depth || 3,
            bidirectional: true
            }
          },
          {
            field: "projectName",
            tokenize: "strict",
            context: { 
            resolution: SearchConfig?.search?.resolution || 5,
            depth: SearchConfig?.search?.depth || 3,
            bidirectional: true
            }
          },
          {
            field: "filename",
            tokenize: "strict",
            resolution: 9,
            context: { 
            resolution: SearchConfig?.search?.resolution || 5,
            depth: SearchConfig?.search?.depth || 3,
            bidirectional: true
            }
          },
          {
            field: "extension",
            tokenize: "strict",
            context: { 
            resolution: SearchConfig?.search?.resolution || 5,
            depth: SearchConfig?.search?.depth || 3,
            bidirectional: true
            }
          },
          {
            field: "author",
            tokenize: "strict",
            context: { 
            resolution: SearchConfig?.search?.resolution || 5,
            depth: SearchConfig?.search?.depth || 3,
            bidirectional: true
            }
          }
        ]
      });

      this.indices.projects = new FlexSearch.Document({
        id: "id",
        ...commonConfig,
        index: [
          { field: "name", tokenize: "strict", resolution: 9, context: { resolution: SearchConfig?.search?.resolution || 5, depth: SearchConfig?.search?.depth || 3, bidirectional: true } },
          { field: "description", tokenize: "strict", resolution: 9, context: { resolution: SearchConfig?.search?.resolution || 5, depth: SearchConfig?.search?.depth || 3, bidirectional: true } },
          { field: "categories", tokenize: "strict", context: { resolution: SearchConfig?.search?.resolution || 5, depth: SearchConfig?.search?.depth || 3, bidirectional: true } },
          { field: "path", tokenize: "strict", context: { resolution: SearchConfig?.search?.resolution || 5, depth: SearchConfig?.search?.depth || 3, bidirectional: true } }
        ]
      });

      this.indices.files = new FlexSearch.Document({
        id: "id",
        ...commonConfig,
        index: [
          { field: "filename", tokenize: "strict", resolution: 9, context: { resolution: SearchConfig?.search?.resolution || 5, depth: SearchConfig?.search?.depth || 3, bidirectional: true } },
          { field: "content", tokenize: "strict", resolution: 9, minlength: 1, threshold: 0, context: { resolution: SearchConfig?.search?.resolution || 5, depth: SearchConfig?.search?.depth || 3, bidirectional: true } },
          { field: "extension", tokenize: "strict", context: { resolution: SearchConfig?.search?.resolution || 5, depth: SearchConfig?.search?.depth || 3, bidirectional: true } },
          { field: "path", tokenize: "strict", context: { resolution: SearchConfig?.search?.resolution || 5, depth: SearchConfig?.search?.depth || 3, bidirectional: true } },
        ]
      });

      this.indices.people = new FlexSearch.Document({
        id: "id",
        ...commonConfig,
        index: [
          { field: "name", tokenize: "strict", resolution: 9, context: { resolution: SearchConfig?.search?.resolution || 5, depth: SearchConfig?.search?.depth || 3, bidirectional: true } },
          { field: "affiliation", tokenize: "strict", context: { resolution: SearchConfig?.search?.resolution || 5, depth: SearchConfig?.search?.depth || 3, bidirectional: true } },
          { field: "roles", tokenize: "strict", context: { resolution: SearchConfig?.search?.resolution || 5, depth: SearchConfig?.search?.depth || 3, bidirectional: true } },
          { field: "notes", tokenize: "strict", resolution: 9, context: { resolution: SearchConfig?.search?.resolution || 5, depth: SearchConfig?.search?.depth || 3, bidirectional: true } }
        ]
      });

      this.indices.notes = new FlexSearch.Document({
        id: "id",
        ...commonConfig,
        index: [
          { field: "content", tokenize: "strict", resolution: 9, minlength: 1, threshold: 0, context: { resolution: 5, depth: 3, bidirectional: true } },
          { field: "author", tokenize: "strict", context: { resolution: SearchConfig?.search?.resolution || 5, depth: SearchConfig?.search?.depth || 3, bidirectional: true } },
          { field: "type", tokenize: "strict", context: { resolution: SearchConfig?.search?.resolution || 5, depth: SearchConfig?.search?.depth || 3, bidirectional: true } },
          { field: "entityName", tokenize: "strict", context: { resolution: SearchConfig?.search?.resolution || 5, depth: SearchConfig?.search?.depth || 3, bidirectional: true } }
        ]
      });

      console.log('SearchService: FlexSearch indices initialized successfully');
    } catch (error) {
      console.error('SearchService: Error initializing indices:', error);
    }
  }

  /**
   * Load existing index from JSON file
   */
  async loadIndexFromFile() {
    try {
      if (!this.indexFilePath || !fs.existsSync(this.indexFilePath)) {
        console.log('SearchService: No existing index file found, will create new one');
        return {
          version: '1.0',
          timestamp: new Date().toISOString(),
          documentStore: [],
          indexedProjects: {},
          performanceStats: this.performanceStats,
          maxIndexingFileSize: this.maxIndexingFileSize
        };
      }

      console.log('SearchService: Loading index from file:', this.indexFilePath);
      const indexData = JSON.parse(fs.readFileSync(this.indexFilePath, 'utf8'));
      
      if (!indexData.version || indexData.version !== '1.0') {
        console.warn('SearchService: Invalid or outdated index file, creating new one');
        return {
          version: '1.0',
          timestamp: new Date().toISOString(),
          documentStore: [],
          indexedProjects: {},
          performanceStats: this.performanceStats,
          maxIndexingFileSize: this.maxIndexingFileSize
        };
      }
       if (indexData.maxIndexingFileSize !== undefined) {
      this.previousMaxFileSize = indexData.maxIndexingFileSize;
      console.log(`SearchService: Previous file size limit was ${(this.previousMaxFileSize / (1024 * 1024)).toFixed(3)}MB`);
      console.log(`SearchService: Current file size limit is ${(this.maxIndexingFileSize / (1024 * 1024)).toFixed(3)}MB`);
    }
      console.log(`SearchService: Loaded index with ${indexData.documentStore.length} documents`);
      console.log(`SearchService: Indexed projects:`, Object.keys(indexData.indexedProjects || {}));
      return indexData;
    } catch (error) {
      console.error('SearchService: Error loading index file:', error);
      return {
        version: '1.0',
        timestamp: new Date().toISOString(),
        documentStore: [],
        indexedProjects: {},
        performanceStats: this.performanceStats,
        maxIndexingFileSize: this.maxIndexingFileSize
      };
    }
  }

  /**
   * Save index to JSON file
   */
  async saveIndexToFile() {
    try {
      if (!this.indexFilePath) {
        await this.setupIndexFilePath();
      }

      const indexData = {
        version: '1.0',
        timestamp: new Date().toISOString(),
        documentStore: Array.from(this.documentStore.entries()),
        indexedProjects: Object.fromEntries(this.indexedProjectsMap.entries()),
        performanceStats: this.performanceStats,
        maxIndexingFileSize: this.maxIndexingFileSize
      };

      fs.writeFileSync(this.indexFilePath, JSON.stringify(indexData, null, 2));
      console.log(`SearchService: Index saved to file with ${this.documentStore.size} documents`);
    } catch (error) {
      console.error('SearchService: Error saving index file:', error);
    }
  }
  buildIndicesFromDocumentStore() {
    console.log('SearchService: Building FlexSearch indices from document store');
    let documentsProcessed = 0;
    let totalIndexEntries = 0;
    const batchSize = 100;
    const documents = Array.from(this.documentStore.values());
    
    for (let i = 0; i < documents.length; i += batchSize) {
      const batch = documents.slice(i, i + batchSize);
      
      batch.forEach(doc => {
        const indexNames = this.getIndexNamesForType(doc.type);
        let docAddedToAnyIndex = false;
        
        indexNames.forEach(indexName => {
          if (this.indices[indexName]) {
            try {
              this.indices[indexName].add(doc);
              totalIndexEntries++;
              docAddedToAnyIndex = true;
            } catch (error) {
              console.warn(`SearchService: Error adding document ${doc.id} to ${indexName} index:`, error.message);
            }
          }
        });
        
        if (docAddedToAnyIndex) {
          documentsProcessed++;
        }
      });
    }
    
    console.log(`SearchService: Built indices with ${documentsProcessed} unique documents`);
    console.log(`SearchService: Total index entries: ${totalIndexEntries}`);
  }

  /**
   * Emit stats update event for UI
   */
  emitStatsUpdate(updateResults) {
    if (typeof window !== 'undefined' && window.dispatchEvent) {
      window.dispatchEvent(new CustomEvent('searchStatsUpdated', { 
        detail: { updateResults, stats: this.getSearchStats() } 
      }));
    }
  }


  async compareAndUpdateIndex(currentProjects) {
    const currentProjectIds = new Set(currentProjects.map(p => p.id));
    const indexedProjectIds = new Set(this.indexedProjectsMap.keys());
    
    const projectsToAdd = currentProjects.filter(p => !indexedProjectIds.has(p.id));
    const projectsToRemove = Array.from(indexedProjectIds).filter(id => !currentProjectIds.has(id));
    
    // Check for path changes
    const projectsToUpdate = currentProjects.filter(p => {
      if (!indexedProjectIds.has(p.id)) return false;
      
      const indexedProject = this.indexedProjectsMap.get(p.id);
      return indexedProject.path !== p.path;
    });

    console.log(`SearchService: Index comparison results:`);
    console.log(`Projects to add: ${projectsToAdd.length}`);
    console.log(`Projects to remove: ${projectsToRemove.length}`);
    console.log(`Projects to update: ${projectsToUpdate.length}`);

    if (projectsToAdd.length === 0 && projectsToRemove.length === 0 && projectsToUpdate.length === 0) {
      console.log('SearchService: No changes detected, index is up to date');
      return { added: 0, removed: 0, updated: 0 };
    }
    
    // Remove projects without rebuilding indices
    for (const projectId of projectsToRemove) {
      await this.removeProjectDocumentsOnly(projectId);
    }

    // Add new projects (already incremental)
    for (const project of projectsToAdd) {
      console.log(`SearchService: Adding new project: ${project.name}`);
      await this.indexProject(project);
    }

    // Updating projects by removing old and adding new
    for (const project of projectsToUpdate) {
      console.log(`SearchService: Updating project: ${project.name}`);
      await this.removeProjectDocumentsOnly(project.id);
      await this.indexProject(project);
    }

    console.log('SearchService: Incremental updates completed without index rebuild');

    return {
      added: projectsToAdd.length,
      removed: projectsToRemove.length,
      updated: projectsToUpdate.length
    };
  }
   async removeProjectDocumentsOnly(projectId) {
    console.log(`SearchService: Removing documents for project ${projectId}`);
    
    const documentsToRemove = [];
    this.documentStore.forEach((doc, docId) => {
      if (doc.item && doc.item.projectId === projectId) {
        documentsToRemove.push({ docId, doc });
      }
    });
    
    // Remove from document store
    documentsToRemove.forEach(({ docId }) => {
      this.documentStore.delete(docId);
    });
    if (documentsToRemove.length > 0) {
      console.log(`SearchService: Removed ${documentsToRemove.length} documents from document store`);
    }

    // Remove from indexed projects map
    this.indexedProjectsMap.delete(projectId);
    
    console.log(`SearchService: Removed project ${projectId} (${documentsToRemove.length} documents)`);
  }

  /**
   * Index a single project
   */
  async indexProject(project) {
    console.log(`SearchService: Indexing project: ${project.name}`);
    
    try {
      // Index project metadata
      await this.indexProjectMetadata(project);
      // Index files if project path exists
      if (project.path && fs.existsSync(project.path)) {
        await this.FolderTraversal(project, this.maxIndexingFileSize);
      }
      // Index people
      if (project.people && Array.isArray(project.people)) {
        for (const person of project.people) {
          await this.indexPerson(person, project);
        }
      }
      // Index notes
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
      // Mark project as indexed
      this.indexedProjectsMap.set(project.id, {
        id: project.id,
        name: project.name,
        path: project.path,
        lastIndexed: Date.now()
      });
      
      console.log(`SearchService: Successfully indexed project: ${project.name}`);
    } catch (error) {
      console.error(`SearchService: Error indexing project ${project.name}:`, error);
    }
  }

  /**
   * Initialize the service with project data and optional file size limit
   */
  async initialize(projects = [], maxFileSize = 0.1 * 1024 * 1024) {
    // If already initialized, only check for changes
    if (this.isInitialized && this.indicesBuiltThisSession) {
      console.log('SearchService: Already initialized this session, checking for changes...');
      
      // Updating current projects data
      this.projectsData = projects;

      // Checking for project changes (additions, removals, updates)
      const updateResults = await this.compareAndUpdateIndex(projects);
      
      if (updateResults.added > 0 || updateResults.removed > 0 || updateResults.updated > 0) {
        await this.saveIndexToFile();
        console.log('SearchService: Project changes handled:', updateResults);
        this.emitStatsUpdate(updateResults);
      } else {
        console.log('SearchService: No project changes detected');
      }
      
      return;
    }
    try {
      console.log('SearchService: Starting initialization with persistent indexing');
      console.log('SearchService: Projects to process:', projects.length);
      console.log('SearchService: Max file size for indexing:', (maxFileSize / (1024 * 1024)).toFixed(3), 'MB');

      this.projectsData = projects;
      this.maxIndexingFileSize = maxFileSize;
      
      // Load existing index
      const existingIndex = await this.loadIndexFromFile();
      const hasExistingData = existingIndex.documentStore && existingIndex.documentStore.length > 0;
      
      if (hasExistingData) {
        console.log('SearchService: Found existing index, performing fast restoration');
        
        // Fast restore from existing index
        this.documentStore = new Map(existingIndex.documentStore);
        console.log(`SearchService: Restored ${this.documentStore.size} documents from existing index`);
        
        // Restore indexed projects map
        if (existingIndex.indexedProjects) {
          this.indexedProjectsMap = new Map(Object.entries(existingIndex.indexedProjects));
          console.log(`SearchService: Restored ${this.indexedProjectsMap.size} indexed projects`);
        }
        if (existingIndex.performanceStats) {
          this.performanceStats = { ...this.performanceStats, ...existingIndex.performanceStats };
        }
        
        if (!this.indicesBuiltThisSession) {
          console.log('SearchService: Building FlexSearch indices from document store...');
          const startTime = Date.now();
          this.buildIndicesFromDocumentStore();
          const buildTime = Date.now() - startTime;
          console.log(`SearchService: FlexSearch indices built in ${buildTime}ms`);
          this.indicesBuiltThisSession = true;
        } else {
          console.log('SearchService: FlexSearch indices already built this session');
        }
        
        this.isInitialized = true;
        const fileSizeChanged = this.previousMaxFileSize !== null && 
                       this.previousMaxFileSize !== maxFileSize;
        if (fileSizeChanged) {
          console.log(`SearchService: File size limit changed from ${(existingIndex.maxIndexingFileSize / (1024 * 1024)).toFixed(3)}MB to ${(maxFileSize / (1024 * 1024)).toFixed(3)}MB - will reindex affected projects`);
          this.maxIndexingFileSize = maxFileSize;
          
          setTimeout(async () => {
            this.indexingInProgress = true;
            const updateResults = await this.compareAndUpdateIndex(projects);
            this.indexingInProgress = false;
            await this.saveIndexToFile();
            console.log('SearchService: Background update completed:', updateResults);
          }, 100);
        } else {
          setTimeout(async () => {
            this.indexingInProgress = true;
            const updateResults = await this.compareAndUpdateIndex(projects);
            this.indexingInProgress = false;
            
            if (updateResults.added > 0 || updateResults.removed > 0 || updateResults.updated > 0) {
              await this.saveIndexToFile();
              console.log('SearchService: Incremental update completed:', updateResults);
            } else {
              console.log('SearchService: No changes detected, index is up to date');
            }
          }, 100);
        }
        
      } else {
        console.log('SearchService: No existing index found, creating new index');
        this.isInitialized = true; 
        this.indexingInProgress = true;
        
        // Index all projects
        for (const project of projects) {
          await this.indexProject(project);
        }
        
        this.indexingInProgress = false;
        
        // Save the new index
        await this.saveIndexToFile();
        
        console.log('SearchService: New index created and saved');
      }
      
      console.log('SearchService: Initialization complete');
      console.log('Documents indexed:', this.documentStore.size);
      
      const stats = this.getSearchStats();
      console.log('SearchService: Final indexing summary:');
      Object.entries(stats.documentsByType).forEach(([type, count]) => {
        console.log(`  ${type}: ${count} documents`);
      });
      console.log(`  Content-indexed files: ${stats.contentIndexedFiles}`);
      
    } catch (error) {
      console.error('SearchService: Initialization error:', error);
      this.indexingInProgress = false;
      this.isInitialized = true; 
    }
  }

  /**
   * Clear all indices and document store
   */
  clearIndices() {
    this.documentStore.clear();
    this.resultCache.clear();
    this.indexedProjectsMap.clear();
    this.initializeIndices();
  }

  /**
   * complete reindex with optional new file size limit
   */
  async reindexAll(maxFileSize = null) {
    console.log('SearchService: Starting complete reindex');
    
    try {
      const fileSizeLimit = maxFileSize || this.maxIndexingFileSize;
      this.clearIndices();
      this.maxIndexingFileSize = fileSizeLimit;
      
      this.indexingInProgress = true;
      
      // Reindex all current projects
      for (const project of this.projectsData) {
        await this.indexProject(project);
      }
      
      this.indexingInProgress = false;
      
      // Save the new index
      await this.saveIndexToFile();
      
      console.log('SearchService: Complete reindex finished');
      
    } catch (error) {
      console.error('SearchService: Reindex error:', error);
      this.indexingInProgress = false;
      throw error;
    }
  }

  async FolderTraversal(project, maxFileSize = null) {
    const fileSizeLimit = maxFileSize || this.maxIndexingFileSize;
    console.log(`SearchService: Indexing files in: ${project.path} (max size: ${(fileSizeLimit / (1024 * 1024)).toFixed(3)}MB)`);

    let totalFiles = 0;
    let indexedFiles = 0;
    let skippedLargeFiles = 0;
    
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
              
              if (stats.size > fileSizeLimit) {
                skippedLargeFiles++;
                continue;
              }
              
              const extension = path.extname(item).toLowerCase();
              const isTextFile = this.isTextFile(item, extension);
              
              if (isTextFile) {
                const success = await this.FileScanner (fullPath, relativePath, project, stats);
                if (success) {
                  indexedFiles++;
                }
              }
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
    
    console.log(`SearchService: Indexing complete for ${project.name}:`);
    console.log(`  - Total files found: ${totalFiles}`);
    console.log(`  - Files indexed: ${indexedFiles}`);
    console.log(`  - Large files skipped: ${skippedLargeFiles}`);
  }

  isTextFile(filename, extension) {
    const textExtensions = [
      '.py', '.js', '.jsx', '.ts', '.tsx', '.html', '.htm', '.css', '.scss',
      '.json', '.txt', '.md', '.csv', '.sql', '.xml', '.yaml', '.yml',
      '.ipynb', '.r', '.rmd', '.log', '.sh', '.bat', '.ps1', '.ini', '.conf', '.cpp'
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

  async FileScanner (fullPath, relativePath, project, stats) {
    try {
      let content = '';
      try {
        content = fs.readFileSync(fullPath, 'utf8');
      } catch (readError) {
        console.error(`SearchService: Failed to read ${relativePath} - ${readError.message}`);
        return false;
      }
      
      const extension = path.extname(relativePath).toLowerCase();
      const filename = path.basename(relativePath);
      
      const searchableContent = `${filename} ${content}`;      
      const docId = `file_${project.id}_${relativePath.replace(/[^a-zA-Z0-9]/g, '_')}`;
      
      const doc = {
        id: docId,
        type: 'file',
        title: filename,
        content: searchableContent,
        filename: filename,
        extension: extension,
        path: relativePath,
        relativePath: relativePath,
        projectName: project.name,
        projectId: project.id,
        metadata: JSON.stringify({
          size: stats.size,
          lastModified: stats.mtime,
          isContentIndexed: true,
          source: 'brute-force',
          contentLength: content.length
        })
      };
      
      this.addToIndices(doc, ['main', 'files']);
      
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
      
      return true;
      
    } catch (error) {
      console.error(`SearchService: Error indexing ${relativePath}:`, error);
      return false;
    }
  }

  generateDocumentId(type, identifier, subId = '') {
    const cleanId = `${type}_${identifier}_${subId}`.replace(/[^a-zA-Z0-9_-]/g, '_');
    return cleanId;
  }

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
    };

    this.addToIndices(doc, ['main', 'projects']);
    this.documentStore.set(docId, { ...doc, item: project });
  }

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

  async indexPerson(person, project) {
    if (!person || !person.id) return;
    
    const searchableContent = [
      this.formatPersonName(person.name),
      person.affiliation || '',
      (person.roles || []).join(' '),
      (person.notes || []).map(note => note.content).join(' ')
    ].filter(part => part && part.trim()).join(' ');
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
    };
    
    this.addToIndices(doc, ['main', 'people']);
    this.documentStore.set(docId, { 
      ...doc, 
      item: { 
        ...person, 
        projectName: project.name 
      } 
    });

    if (person.notes && Array.isArray(person.notes)) {
      for (const note of person.notes) {
        await this.indexNote(note, project, 'person', this.formatPersonName(person.name));
      }
    }
  }

  async indexNote(note, project, entityType, entityName) {
    if (!note || !note.content) return;
    
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

  async indexAssetGroup(group, project) {
    if (!group || !group.id) return;
    
    const searchableContent = [
      group.name || '',
      group.details || '',
      (group.assets || []).map(asset => asset.uri).join(' ')
    ].filter(part => part && part.trim()).join(' ');
    
    const docId = this.generateDocumentId('asset-group', group.id);
    
    const doc = {
      id: docId,
      type: 'asset-group',
      title: group.name,
      content: searchableContent,
      projectName: project.name,
      projectId: project.id,
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

  formatPersonName(name) {
    if (!name) return '';
    
    if (typeof name === 'string') return name;
    
    const parts = [];
    if (name.first) parts.push(name.first);
    if (name.middle) parts.push(name.middle);
    if (name.last) parts.push(name.last);
    
    return parts.join(' ').trim();
  }

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
   * Preprocess query by removing stop words and applying other filters
   */
  preprocessQuery(originalQuery) {
    try {
      const config = SearchConfig?.search?.preprocessing;
      
      if (!config || !config.enableStopWords) {
        return {
          processedQuery: originalQuery,
          originalQuery: originalQuery,
          removedWords: [],
          keptWords: originalQuery.toLowerCase().trim().split(/\s+/).filter(word => word.length > 0)
        };
      }

      // Convert to lowercase and split into words
      const words = originalQuery.toLowerCase().trim().split(/\s+/).filter(word => word.length > 0);
      
      if (words.length === 0) {
        return {
          processedQuery: '',
          originalQuery: originalQuery,
          removedWords: [],
          keptWords: []
        };
      }

      // Combine regular stop words with technical stop words
      const allStopWords = new Set([
        ...(config.stopWords || []),
        ...(config.technicalStopWords || [])
      ]);

      const minWordLength = config.minWordLength || 2;
      const removedWords = [];
      const keptWords = [];

      words.forEach(word => {
        const cleanWord = word.replace(/^[^\w]+|[^\w]+$/g, '');
        if (cleanWord.length === 0) {
          removedWords.push(word);
          return;
        }
        if (allStopWords.has(cleanWord) || cleanWord.length < minWordLength) {
          removedWords.push(word);
        } else {
          keptWords.push(cleanWord);
        }
      });

      // If all words were removed, keep the original query to avoid empty searches
      const processedQuery = keptWords.length > 0 ? keptWords.join(' ') : originalQuery;

      return {
        processedQuery: processedQuery,
        originalQuery: originalQuery,
        removedWords: removedWords,
        keptWords: keptWords,
        wasProcessed: keptWords.length < words.length
      };
      
    } catch (error) {
      console.error('SearchService: Error preprocessing query:', error);
      return {
        processedQuery: originalQuery,
        originalQuery: originalQuery,
        removedWords: [],
        keptWords: originalQuery.toLowerCase().trim().split(/\s+/).filter(word => word.length > 0),
        error: error.message
      };
    }
  }

  /**
   * Search method with query preprocessing
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
    
    // Preprocess the query
    const queryPreprocessing = this.preprocessQuery(query);
    const searchQuery = queryPreprocessing.processedQuery;
    const cacheKey = this.generateCacheKey(searchQuery, options);
    
    // Check cache first
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      console.log('SearchService: Returning cached results');
      return {
        ...cached,
        queryPreprocessing: queryPreprocessing
      };
    }
    
    try {
      const searchResults = this.performSearch(searchQuery, options);
      const groupedResults = this.groupResultsByType(searchResults);
      
      // Add preprocessing information to results
      groupedResults.queryPreprocessing = queryPreprocessing;
      groupedResults.searchQuery = searchQuery;
      const searchTime = Date.now() - startTime;
      this.updateSearchStats(searchTime);
      this.addToCache(cacheKey, groupedResults);
      
      console.log(`SearchService: Search completed in ${searchTime}ms, found ${searchResults.length} results`);
      console.log(`SearchService: Used query: "${searchQuery}" (processed from: "${query}")`);
      
      return groupedResults;
      
    } catch (error) {
      console.error('SearchService: Search error:', error);
      const emptyResults = this.getEmptyResults();
      emptyResults.queryPreprocessing = queryPreprocessing;
      emptyResults.searchQuery = searchQuery;
      return emptyResults;
    }
  }

  /**
   * performSearch that handles both processed and original queries
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
      
      let allResults = new Map(); 
      const queryTerms = query.toLowerCase().trim().split(/\s+/);
      
      // 1: Exact query search with score tracking
      const exactResults = this.indices.main.search(query, { 
        limit: maxResults,
        suggest: true,
        context: true,
      });
      this.processFlexSearchResultsWithScores(exactResults, allResults, 1.0);
      
      // 2: Fuzzy search for typo tolerance
      const enableFuzzy = SearchConfig?.search?.enableFuzzySearch !== false;
    if (enableFuzzy) {
      const fuzzyThreshold = SearchConfig?.search?.fuzzySearchThreshold || 3;
      const fuzzyResults = this.indices.main.search(query, {
        limit: maxResults,
        suggest: true,
        threshold: fuzzyThreshold 
      });
      this.processFlexSearchResultsWithScores(fuzzyResults, allResults, 0.8);
    }
      
      // 3: Individual term searches for partial matching
      if (queryTerms.length > 1) {
        for (const term of queryTerms) {
          if (term.length >= 2) {
            const termResults = this.indices.main.search(term, { 
              limit: maxResults,
              context: true
            });
            this.processFlexSearchResultsWithScores(termResults, allResults, 0.6);
          }
        }
      }
      
      // 4: Context-aware search
      const contextResults = this.indices.main.search(query, {
        limit: maxResults,
        context: {
          depth: SearchConfig?.search?.depth || 3,
          resolution: SearchConfig?.search?.resolution || 3,
        }
      });
      this.processFlexSearchResultsWithScores(contextResults, allResults, 0.7);
      
      console.log(`SearchService: Found ${allResults.size} unique document IDs from search`);
      
      // Convert Map to search results with scoring
      let searchResults = [];
      allResults.forEach((flexScore, id) => {
        const docData = this.documentStore.get(id);
        if (docData) {
          const relevance = this.calculateRelevance(
            docData, 
            query, 
            queryTerms, 
            flexScore,
            { searchType: 'multi-strategy', ...options }
          );
          
          searchResults.push({
            id: id,
            score: relevance,
            flexSearchScore: flexScore,
            type: docData.type,
            item: docData.item,
            highlights: this.generateHighlights(docData, query)
          });
        }
      });
      
      // Sort by relevance score (highest first)
      searchResults.sort((a, b) => b.score - a.score);
      
      // Apply filters
      if (type && type !== 'all') {
        searchResults = searchResults.filter(result => result.type === type);
      }
      
      if (projectId && projectId !== 'all') {
        searchResults = searchResults.filter(result => 
          result.item && result.item.projectId === projectId
        );
      }
      
      searchResults = searchResults.slice(0, maxResults);
      return searchResults;
      
    } catch (error) {
      console.error('SearchService: Error in performSearch:', error);
      return [];
    }
  }
    /**
     * Process FlexSearch results with score tracking
     */
    processFlexSearchResultsWithScores(flexSearchResults, resultsMap, scoreMultiplier = 1.0) {
      if (Array.isArray(flexSearchResults)) {
        flexSearchResults.forEach(fieldResult => {
          if (fieldResult && fieldResult.result && Array.isArray(fieldResult.result)) {
            fieldResult.result.forEach((id, index) => {
              // Create position-based score (higher position = lower score)
              const positionScore = Math.max(0.1, 1.0 - (index * 0.1)); 
              const flexScore = positionScore * scoreMultiplier;
              
              const currentScore = resultsMap.get(id) || 0;
              resultsMap.set(id, Math.max(currentScore, flexScore));
            });
          }
        });
      }
    }
  //   **
  //  * Initialize scoring configuration in constructor
  //  */
  initializeScoringConfig(config = {}) {
    const weights = config.weights || {}; 
    this.scoringWeights = {
      exactPhraseContent: weights.exactPhraseContent || 1.0,
      exactPhraseTitle: weights.exactPhraseTitle || 0.9,
      individualWordContent: weights.individualWordContent || 0.2,
      individualWordTitle: weights.individualWordTitle || 0.15,
      allWordsBonus: weights.allWordsBonus || 0.3,
      partialWordMatch: weights.partialWordMatch || 0.1,
      titlePartialMatch: weights.titlePartialMatch || 0.08,
      contentIndexedBonus: weights.contentIndexedBonus || 0.05,
      flexSearchScore: weights.flexSearchScore || 0.4,
      proximityBonus: weights.proximityBonus || 0.2,
      fieldLengthPenalty: weights.fieldLengthPenalty || 0.1
    };
    
    this.maxBaseScore = config.maxBaseScore || 100;
  }

  calculateRelevance(docData, originalQuery, queryTerms, flexSearchScore, searchContext = {}) {
    const query = originalQuery.toLowerCase();
    const content = (docData.content || '').toLowerCase();
    const title = (docData.title || '').toLowerCase();
    
    let score = 0;
    score += flexSearchScore * this.scoringWeights.flexSearchScore * this.maxBaseScore;

    const exactPhraseScore = this.calculateExactPhraseScore(content, title, query);
    score += exactPhraseScore;

    const completenessData = this.calculateQueryCompleteness(content, title, queryTerms);
    const completenessPenalty = this.calculateCompletenessPenalty(completenessData, queryTerms.length);
    score *= completenessPenalty; 

    const wordMatchData = this.calculateWordMatches(content, title, queryTerms);
    score += wordMatchData.score;

    if (completenessData.matchedTerms >= queryTerms.length) {
      score += this.scoringWeights.allWordsBonus * this.maxBaseScore;
    }

    score += this.calculatePartialMatches(content, title, queryTerms);
    if (completenessData.matchedTerms > 1) {
      score += this.calculateProximityScore(content, queryTerms);
    }

    score += this.calculateFieldLengthScore(content, title);
    score += this.calculateContentTypeBonus(docData);
    score += this.calculateBalancedTermFrequencyScore(content, title, queryTerms, completenessData);
    return Math.min(score / this.maxBaseScore, 1.0);
  }

  /**
   * Calculate exact phrase match scores
   */
  calculateExactPhraseScore(content, title, query) {
    let score = 0;
    
    if (content.includes(query)) {
      const position = content.indexOf(query);
      const positionWeight = Math.max(0.5, 1 - (position / content.length));
      score += this.scoringWeights.exactPhraseContent * this.maxBaseScore * positionWeight;
    }
    
    if (title.includes(query)) {
      const position = title.indexOf(query);
      const positionWeight = Math.max(0.7, 1 - (position / title.length));
      score += this.scoringWeights.exactPhraseTitle * this.maxBaseScore * positionWeight;
    }
    
    return score;
  }

  /**
   * Calculate partial word matching scores (fuzzy-like matching)
   */
  calculatePartialMatches(content, title, queryTerms) {
    let score = 0;
    
    queryTerms.forEach(term => {
      if (term.length >= 3) {
        // Try different partial match strategies
        const partialTerm = term.substring(0, Math.max(3, term.length - 1));
        const prefixTerm = term.substring(0, Math.min(term.length, 4));
        
        // Partial matches in content
        if (content.includes(partialTerm) || this.hasPartialMatch(content, prefixTerm)) {
          const matchQuality = partialTerm.length / term.length;
          score += this.scoringWeights.partialWordMatch * this.maxBaseScore * matchQuality;
        }
        
        // Partial matches in title
        if (title.includes(partialTerm) || this.hasPartialMatch(title, prefixTerm)) {
          const matchQuality = partialTerm.length / term.length;
          score += this.scoringWeights.titlePartialMatch * this.maxBaseScore * matchQuality;
        }
      }
    });
    
    return score;
  }

  /**
   * Calculate proximity score (how close query terms appear to each other)
   */
  calculateProximityScore(content, queryTerms) {
    if (queryTerms.length < 2) return 0;
    
    let proximityScore = 0;
    const positions = {};
    
    // Find positions of all terms
    queryTerms.forEach(term => {
      const termLower = term.toLowerCase();
      const termPositions = [];
      let index = content.indexOf(termLower);
      
      while (index !== -1) {
        termPositions.push(index);
        index = content.indexOf(termLower, index + 1);
      }
      
      if (termPositions.length > 0) {
        positions[term] = termPositions;
      }
    });
    
    // Calculate proximity bonuses
    const termKeys = Object.keys(positions);
    for (let i = 0; i < termKeys.length - 1; i++) {
      for (let j = i + 1; j < termKeys.length; j++) {
        const term1Positions = positions[termKeys[i]];
        const term2Positions = positions[termKeys[j]];
        
        // Find closest pair
        let minDistance = Infinity;
        term1Positions.forEach(pos1 => {
          term2Positions.forEach(pos2 => {
            const distance = Math.abs(pos1 - pos2);
            minDistance = Math.min(minDistance, distance);
          });
        });
        
        if (minDistance < Infinity) {
          // Closer terms get higher scores
          const proximityWeight = Math.max(0, 1 - (minDistance / 100));
          proximityScore += this.scoringWeights.proximityBonus * this.maxBaseScore * proximityWeight;
        }
      }
    }
    
    return proximityScore;
  }

  /**
   * Calculate field length normalization score
   */
  calculateFieldLengthScore(content, title) {
    const contentLength = content.length;
    const titleLength = title.length;
    
    let score = 0;
    if (contentLength > 50 && contentLength < 5000) {
      score += this.scoringWeights.fieldLengthPenalty * this.maxBaseScore * 0.1;
    }
    if (titleLength > 5 && titleLength < 100) {
      score += this.scoringWeights.fieldLengthPenalty * this.maxBaseScore * 0.05;
    }
    
    return score;
  }

  /**
   * Calculate content type and quality bonuses
   */
  calculateContentTypeBonus(docData) {
    let score = 0;
    const typeMultipliers = {
      'project': 1.2,
      'file': 1.0,
      'person': 1.1,
      'note': 0.9,
      'asset': 0.8
    };
    const multiplier = typeMultipliers[docData.type] || 1.0;
    score *= multiplier;
    return score;
  }
  /**
   * Calculate query completeness - how many query terms are found
   */
  calculateQueryCompleteness(content, title, queryTerms) {
    let matchedTerms = 0;
    let totalTermOccurrences = 0;
    const termMatchDetails = {};
    
    queryTerms.forEach(term => {
      const termLower = term.toLowerCase();
      let termFound = false;
      let termOccurrences = 0;
      
      // Check content
      if (content.includes(termLower)) {
        termFound = true;
        termOccurrences += this.countOccurrences(content, termLower);
      }
      
      // title
      if (title.includes(termLower)) {
        termFound = true;
        termOccurrences += this.countOccurrences(title, termLower);
      }
      
      if (termFound) {
        matchedTerms++;
        totalTermOccurrences += termOccurrences;
      }
      
      termMatchDetails[term] = {
        found: termFound,
        occurrences: termOccurrences
      };
    });
    
    return {
      matchedTerms,
      totalTerms: queryTerms.length,
      completenessRatio: matchedTerms / queryTerms.length,
      totalOccurrences: totalTermOccurrences,
      termDetails: termMatchDetails
    };
  }

  /**
   * Calculate completeness penalty for missing query terms
   */
  calculateCompletenessPenalty(completenessData, totalQueryTerms) {
    const { matchedTerms } = completenessData;
    
    if (matchedTerms === 0) {
      return 0.0; 
    }
    
    if (matchedTerms === totalQueryTerms) {
      return 1.0; 
    }
    const missingTerms = totalQueryTerms - matchedTerms;
    const missingRatio = missingTerms / totalQueryTerms;
    const penalty = Math.pow(0.5, missingRatio * 2);
    
    return penalty;
  }

  /**
   * Calculate balanced term frequency score that considers completeness
   */
  calculateBalancedTermFrequencyScore(content, title, queryTerms, completenessData) {
    let score = 0;
    const totalWords = content.split(/\s+/).length;
    const titleWords = title.split(/\s+/).length;
    
    // Giving frequency bonuses to terms that actually matched
    queryTerms.forEach(term => {
      const termData = completenessData.termDetails[term];
      if (termData && termData.found) {
        const termLower = term.toLowerCase();
        
        // Term frequency in content (capped to prevent spam)
        const contentOccurrences = this.countOccurrences(content, termLower);
        if (contentOccurrences > 0) {
          const tf = Math.min(contentOccurrences / Math.max(totalWords, 1), 0.1); 
          score += tf * this.maxBaseScore * 0.1;
        }
        // Term frequency in title (higher weight, also capped)
        const titleOccurrences = this.countOccurrences(title, termLower);
        if (titleOccurrences > 0) {
          const tf = Math.min(titleOccurrences / Math.max(titleWords, 1), 0.3); // logarithmic cap to penalise too much frequency
          score += tf * this.maxBaseScore * 0.15;
        }
      }
    });
    
    return score;
  }

  /**
   * word matching that works with completeness data
   */
  calculateWordMatches(content, title, queryTerms) {
    let score = 0;
    let matchedTerms = 0;
    const termPositions = {};
    
    queryTerms.forEach((term, index) => {
      const termLower = term.toLowerCase();
      let termMatched = false;
      
      // Content matches
      if (content.includes(termLower)) {
        const occurrences = this.countOccurrences(content, termLower);
        const firstPosition = content.indexOf(termLower);
        const positionWeight = Math.max(0.3, 1 - (firstPosition / content.length));
        
        const frequencyScore = Math.min(1, Math.log(occurrences + 1) / Math.log(5)); 
        score += this.scoringWeights.individualWordContent * this.maxBaseScore * 
                frequencyScore * positionWeight;
        
        termPositions[term] = firstPosition;
        termMatched = true;
      }
      
      // Title matches (higher weight)
      if (title.includes(termLower)) {
        const occurrences = this.countOccurrences(title, termLower);
        const firstPosition = title.indexOf(termLower);
        const positionWeight = Math.max(0.5, 1 - (firstPosition / title.length));
        
        const frequencyScore = Math.min(1, Math.log(occurrences + 1) / Math.log(3)); 
        score += this.scoringWeights.individualWordTitle * this.maxBaseScore * 
                frequencyScore * positionWeight;
        
        termMatched = true;
      }
      
      if (termMatched) {
        matchedTerms++;
      }
    });
    
    return { score, matchedTerms, termPositions };
  }

  /**
   * Count occurrences of a term in text
   */
  countOccurrences(text, term) {
    let count = 0;
    let index = text.indexOf(term);
    
    while (index !== -1) {
      count++;
      index = text.indexOf(term, index + 1);
    }
    
    return count;
  }

  /**
   * Check for partial word matches using regex
   */
  hasPartialMatch(text, partialTerm) {
    try {
      const regex = new RegExp(`\\b${partialTerm}`, 'i');
      return regex.test(text);
    } catch (error) {
      return false;
    }
  }

  generateHighlights(docData, query) {
    const highlights = {};
    
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

  getSuggestions(partialQuery) {
    if (!this.isInitialized || !partialQuery || partialQuery.length < 2) {
      return [];
    }
    
    try {
      const suggestions = new Set();
      const maxSuggestions = SearchConfig?.ui?.maxSuggestions || 8;
      
      const suggestResults = this.indices.main.search(partialQuery, {
        limit: maxSuggestions
      });
      
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

  exportIndex() {
    const exportData = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      documentStore: Array.from(this.documentStore.entries()),
      indexedProjects: Object.fromEntries(this.indexedProjectsMap.entries()),
      performanceStats: this.performanceStats,
      maxIndexingFileSize: this.maxIndexingFileSize,
      projectsData: this.projectsData.map(p => ({
        id: p.id,
        name: p.name,
        path: p.path
      }))
    };
    
    return exportData;
  }

  importIndex(indexData) {
    if (!indexData || indexData.version !== '1.0') {
      throw new Error('Invalid or unsupported index data format');
    }
    
    console.log('SearchService: Importing index data');
    
    this.clearIndices();
    
    this.documentStore = new Map(indexData.documentStore);
    
    if (indexData.indexedProjects) {
      this.indexedProjectsMap = new Map(Object.entries(indexData.indexedProjects));
    }
        
    if (indexData.performanceStats) {
      this.performanceStats = { ...this.performanceStats, ...indexData.performanceStats };
    }
    
    if (indexData.maxIndexingFileSize) {
      this.maxIndexingFileSize = indexData.maxIndexingFileSize;
    }
    console.log('SearchService: Rebuilding FlexSearch indices from imported data');
    this.buildIndicesFromDocumentStore();
    this.indicesBuiltThisSession = true;
    
    this.saveIndexToFile();
    
    console.log('SearchService: Index import completed with FlexSearch indices rebuilt');
  }

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

  generateCacheKey(query, options) {
    return `${query}_${JSON.stringify(options)}`.replace(/[^a-zA-Z0-9_]/g, '_');
  }

  getFromCache(key) {
    const cached = this.resultCache.get(key);
    if (!cached) return null;
    
    if (Date.now() - cached.timestamp > this.cacheTTL) {
      this.resultCache.delete(key);
      return null;
    }
    
    return cached.data;
  }

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

  updateSearchStats(searchTime) {
    this.performanceStats.totalSearches++;
    this.performanceStats.searchTimes.push(searchTime);
    
    if (this.performanceStats.searchTimes.length > 100) {
      this.performanceStats.searchTimes = this.performanceStats.searchTimes.slice(-100);
    }
    
    const sum = this.performanceStats.searchTimes.reduce((a, b) => a + b, 0);
    this.performanceStats.averageSearchTime = sum / this.performanceStats.searchTimes.length;
  }

  getSearchStats() {
    const docsByType = {};
    this.documentStore.forEach(doc => {
      docsByType[doc.type] = (docsByType[doc.type] || 0) + 1;
    });
    
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
      indexedProjects: this.indexedProjectsMap.size,
      indexingInProgress: this.indexingInProgress,
      queueLength: this.indexingQueue.length,
      maxIndexingFileSize: this.maxIndexingFileSize,
      maxIndexingFileSizeMB: (this.maxIndexingFileSize / (1024 * 1024)).toFixed(3),
      performance: this.performanceStats,
      cacheStats: {
        size: this.resultCache.size,
        maxSize: this.maxCacheSize
      }
    };
  }

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
   * Get information about the current index file
   */
  getIndexFileInfo() {
    if (!this.indexFilePath) {
      return { exists: false, path: null, size: 0 };
    }

    try {
      const stats = fs.statSync(this.indexFilePath);
      return {
        exists: true,
        path: this.indexFilePath,
        size: stats.size,
        lastModified: stats.mtime,
        sizeKB: (stats.size / 1024),
        sizeMB: (stats.size / (1024 * 1024) * 100) / 100
      };
    } catch (error) {
      return { exists: false, path: this.indexFilePath, size: 0 };
    }
  }

  /**
   * Delete the index file and start fresh
   */
  async deleteIndexFile() {
  if (this.indexFilePath && fs.existsSync(this.indexFilePath)) {
    try {
      fs.unlinkSync(this.indexFilePath);
      console.log('SearchService: Index file deleted');
      
      this.clearIndices();
      this.isInitialized = false;
      this.indicesBuiltThisSession = false;
      this.indexingInProgress = false;
      this.indexingQueue = [];
      this.indexedProjectsMap.clear();
      this.documentStore.clear();
      this.resultCache.clear();
      
      this.performanceStats = {
        totalSearches: 0,
        totalIndexingTime: 0,
        averageSearchTime: 0,
        documentsIndexed: 0,
        searchTimes: []
      };
      
      console.log('SearchService: Internal state reset after index deletion');
      return true;  
    } catch (error) {
      console.error('SearchService: Error deleting index file:', error);
      return false;
    }
  }
  return true;
}

}

const searchServiceInstance = new SearchService();
export default searchServiceInstance;