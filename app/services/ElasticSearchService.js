import elasticlunr from 'elasticlunr';
import { ipcRenderer } from 'electron';
import fs from 'fs';
import path from 'path';
import SearchConfig from '../constants/search-config';

class ElasticSearchService {
  constructor() {
    this.isInitialized = false;
    this.documentStore = new Map();
    this.projectsData = [];
    this.indexingInProgress = false;
    this.indexingQueue = [];
    this.indices = {
      main: null,
      projects: null,
      files: null,
      people: null,
      notes: null
    };
    
    this.performanceStats = {
      totalSearches: 0,
      totalIndexingTime: 0,
      averageSearchTime: 0,
      documentsIndexed: 0,
      searchTimes: []
    };
    
    this.resultCache = new Map();
    this.maxCacheSize = SearchConfig?.performance?.resultCacheSize || 100;
    this.cacheTTL = SearchConfig?.performance?.resultCacheTTL || 600000;
    this.cacheHits = 0;
    this.cacheMisses = 0;
    this.tagPatterns = SearchConfig?.tagging?.statisticalPatterns || {};
    this.commonTags = SearchConfig?.tagging?.commonTags || {};
    
    this.initializeIndices();
  }

  initializeIndices() {
    try {
      this.indices.main = elasticlunr(function () {
        this.addField('title', { boost: 10 });
        this.addField('content', { boost: 1 });
        this.addField('type', { boost: 5 });
        this.addField('projectName', { boost: 3 });
        this.addField('path', { boost: 2 });
        this.addField('tags', { boost: 8 });
        this.addField('metadata', { boost: 4 });
        this.addField('extension', { boost: 3 });
        this.addField('author', { boost: 2 });
        this.addField('categories', { boost: 6 });
        this.setRef('id');
        this.saveDocument(true);
      });

      this.indices.projects = elasticlunr(function () {
        this.addField('name', { boost: 10 });
        this.addField('description', { boost: 5 });
        this.addField('categories', { boost: 8 });
        this.addField('path', { boost: 2 });
        this.setRef('id');
        this.saveDocument(true);
      });

      this.indices.files = elasticlunr(function () {
        this.addField('filename', { boost: 8 });
        this.addField('content', { boost: 3 });
        this.addField('extension', { boost: 5 });
        this.addField('path', { boost: 2 });
        this.addField('tags', { boost: 6 });
        this.setRef('id');
        this.saveDocument(true);
      });

      this.indices.people = elasticlunr(function () {
        this.addField('name', { boost: 10 });
        this.addField('affiliation', { boost: 5 });
        this.addField('roles', { boost: 6 });
        this.addField('notes', { boost: 3 });
        this.setRef('id');
        this.saveDocument(true);
      });

      this.indices.notes = elasticlunr(function () {
        this.addField('content', { boost: 8 });
        this.addField('author', { boost: 3 });
        this.addField('type', { boost: 2 });
        this.addField('entityName', { boost: 4 });
        this.setRef('id');
        this.saveDocument(true);
      });

      console.log('ElasticSearchService: Indices initialized successfully');
    } catch (error) {
      console.error('ElasticSearchService: Error initializing indices:', error);
    }
  }

  async initialize(projects = []) {
    try {
      console.log('ElasticSearchService: Starting initialization with', projects.length, 'projects');
      
      const initStartTime = Date.now();
      
      this.projectsData = projects;
      this.clearIndices();
      
      this.isInitialized = true;
      this.indexingInProgress = true;
      
      let totalDocumentsAdded = 0;
      
      for (let i = 0; i < projects.length; i++) {
        const project = projects[i];
        const projectStartTime = Date.now();
        let projectDocsAdded = 0;
        
        console.log(`ElasticSearchService: FORCE PROCESSING PROJECT ${i + 1}/${projects.length}: ${project.name}`);
        
        await this.indexProjectMetadata(project);
        projectDocsAdded++;
        
        if (project.path && fs.existsSync(project.path)) {
          console.log(`ElasticSearchService: FORCE SCANNING DIRECTORY: ${project.path}`);
          const filesAdded = await this.bruteForceIndexAllFiles(project);
          projectDocsAdded += filesAdded;
        } else {
          console.error(`ElasticSearchService: PROJECT PATH DOES NOT EXIST: ${project.path}`);
        }
        
        if (project.people && Array.isArray(project.people)) {
          for (const person of project.people) {
            await this.indexPerson(person, project);
            projectDocsAdded++;
          }
        }
        
        if (project.notes && Array.isArray(project.notes)) {
          for (const note of project.notes) {
            await this.indexNote(note, project, 'project', project.name);
            projectDocsAdded++;
          }
        }
        
        this.trackIndexingOperation(projectStartTime, projectDocsAdded, `project-${project.name}`);
        totalDocumentsAdded += projectDocsAdded;
        
        if (i < projects.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      this.indexingInProgress = false;
      
      this.trackIndexingOperation(initStartTime, totalDocumentsAdded, 'full-initialization');
      
      console.log('ElasticSearchService: Initialization complete');
      console.log('Documents indexed:', this.documentStore.size);
      
      const stats = this.getSearchStats();
      console.log('ElasticSearchService: FINAL INDEXING SUMMARY:');
      Object.entries(stats.documentsByType).forEach(([type, count]) => {
        console.log(`  ${type}: ${count} documents`);
      });
      console.log(`  Content-indexed files: ${stats.contentIndexedFiles}`);
      console.log(`  Total indexing time: ${stats.performance.totalIndexingTimeFormatted}`);
      console.log(`  Indexing speed: ${stats.performance.indexingSpeed} docs/sec`);
      
      if (stats.contentIndexedFiles === 0) {
        console.error('ElasticSearchService: ❌ NO FILES WERE CONTENT INDEXED! SOMETHING IS WRONG!');
      } else {
        console.log(`ElasticSearchService: ✅ SUCCESS! ${stats.contentIndexedFiles} files have content indexed`);
      }
      
    } catch (error) {
      console.error('ElasticSearchService: Initialization error:', error);
      this.indexingInProgress = false;
    }
  }

  async bruteForceIndexAllFiles(project) {
    console.log(`ElasticSearchService: BRUTE FORCE INDEXING ALL FILES IN: ${project.path}`);
    
    const startTime = Date.now();
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
                const success = await this.absoluteForceIndexFile(fullPath, relativePath, project, stats);
                if (success) {
                  indexedFiles++;
                }
              }
              
              if (totalFiles % 10 === 0) {
                await new Promise(resolve => setTimeout(resolve, 10));
              }
            }
          } catch (statError) {
            console.warn(`ElasticSearchService: Stat error for ${fullPath}: ${statError.message}`);
          }
        }
      } catch (readError) {
        console.error(`ElasticSearchService: Read error for ${dirPath}: ${readError.message}`);
      }
    };
    
    await scanDirectory(project.path);
    
    this.trackIndexingOperation(startTime, indexedFiles, `directory-scan-${project.name}`);
    
    console.log(`ElasticSearchService: 🏁 BRUTE FORCE COMPLETE: ${indexedFiles}/${totalFiles} files indexed for ${project.name}`);
    
    if (indexedFiles === 0) {
      console.error(`ElasticSearchService: ❌ ZERO FILES INDEXED FOR ${project.name}!`);
    }
    
    return indexedFiles;
  }

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

  async absoluteForceIndexFile(fullPath, relativePath, project, stats) {
    try {
      console.log(`ElasticSearchService:  ABSOLUTE FORCE READING: ${fullPath}`);
      
      let content = '';
      try {
        content = fs.readFileSync(fullPath, 'utf8');
        console.log(`ElasticSearchService:  READ SUCCESS: ${relativePath} (${content.length} characters)`);
      } catch (readError) {
        console.error(`ElasticSearchService: READ FAILED: ${relativePath} - ${readError.message}`);
        return false;
      }
      
      const extension = path.extname(relativePath).toLowerCase();
      const filename = path.basename(relativePath);
      
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
        tags: tags,
        metadata: JSON.stringify({
          size: stats.size,
          lastModified: stats.mtime,
          isContentIndexed: true,
          source: 'brute-force',
          contentLength: content.length
        })
      };
      
      this.addToIndices(doc, ['main', 'files']);
      
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
      
      console.log(`ElasticSearchService:  INDEXED: ${relativePath} with ${content.length} chars of content`);
      return true;
      
    } catch (error) {
      console.error(`ElasticSearchService: ABSOLUTE FORCE INDEX ERROR for ${relativePath}:`, error);
      return false;
    }
  }

  async indexProjectsInChunks(projects) {
    const chunkSize = SearchConfig?.indexing?.batchSize || 5;
    const delay = SearchConfig?.indexing?.batchDelay || 100;
    
    for (let i = 0; i < projects.length; i += chunkSize) {
      const chunk = projects.slice(i, i + chunkSize);
      
      for (const project of chunk) {
        await this.indexProjectLightweight(project);
      }
      
      if (i + chunkSize < projects.length) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
      console.log(`ElasticSearchService: Indexed ${Math.min(i + chunkSize, projects.length)}/${projects.length} projects`);
    }
  }

  clearIndices() {
    this.documentStore.clear();
    this.resultCache.clear();
    Object.keys(this.indices).forEach(key => {
      if (this.indices[key]) {
        this.indices[key] = null;
      }
    });
    this.initializeIndices();
  }

  generateDocumentId(type, identifier, subId = '') {
    const cleanId = `${type}_${identifier}_${subId}`.replace(/[^a-zA-Z0-9_-]/g, '_');
    return cleanId;
  }

  generateTags(content, type, extension = '') {
    const tags = new Set();
    
    tags.add(type);
    
    if (extension) {
      tags.add(`ext-${extension.replace('.', '')}`);
      
      const ext = extension.toLowerCase();
      Object.entries(this.tagPatterns).forEach(([lang, config]) => {
        if (config.extensions && config.extensions.includes(ext)) {
          if (config.tags) {
            config.tags.forEach(tag => tags.add(tag));
          }
          
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
    
    if (content && typeof content === 'string') {
      const lowerContent = content.toLowerCase();
      
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

  async indexProjectLightweight(project) {
    if (!project || !project.id) {
      console.warn('ElasticSearchService: Invalid project object');
      return;
    }

    try {
      await this.indexProjectMetadata(project);
      
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
      
      if (project.assets || project.externalAssets) {
        this.queueProjectForContentIndexing(project);
      }
      
    } catch (error) {
      console.error(`ElasticSearchService: Error in lightweight indexing for project ${project.id}:`, error);
    }
  }

  async indexProjectMetadata(project) {
    const doc = {
      id: this.generateDocumentId('project', project.id),
      type: 'project',
      title: project.name,
      content: this.extractProjectContent(project),
      projectName: project.name,
      projectId: project.id,
      path: project.path,
      categories: (project.categories || []).join(' '),
      tags: this.generateTags(this.extractProjectContent(project), 'project'),
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

    this.addToIndices(doc, ['main', 'projects']);
    this.documentStore.set(doc.id, { ...doc, item: project });
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

  countAssets(assets) {
    if (!assets) return 0;
    
    let count = 1;
    
    if (assets.children && Array.isArray(assets.children)) {
      count += assets.children.reduce((sum, child) => sum + this.countAssets(child), 0);
    }
    
    return count;
  }

  async indexProject(project) {
    if (!project || !project.id) {
      console.warn('ElasticSearchService: Invalid project object');
      return;
    }

    const startTime = Date.now();
    
    try {
      await this.indexProjectMetadata(project);
      
      if (project.assets) {
        await this.indexAssetsWithChunking(project.assets, project);
      }
      
      if (project.externalAssets) {
        await this.indexExternalAssets(project.externalAssets, project);
      }
      
      if (project.people && Array.isArray(project.people)) {
        for (const person of project.people) {
          await this.indexPerson(person, project);
          await new Promise(resolve => setTimeout(resolve, 5));
        }
      }
      
      if (project.notes && Array.isArray(project.notes)) {
        for (const note of project.notes) {
          await this.indexNote(note, project, 'project', project.name);
        }
      }
      
      if (project.assetGroups && Array.isArray(project.assetGroups)) {
        for (const group of project.assetGroups) {
          await this.indexAssetGroup(group, project);
        }
      }

      const indexingTime = Date.now() - startTime;
      this.performanceStats.totalIndexingTime += indexingTime;
      
      console.log(`ElasticSearchService: Indexed project ${project.name} in ${indexingTime}ms`);
      
    } catch (error) {
      console.error(`ElasticSearchService: Error indexing project ${project.id}:`, error);
    }
  }

  async indexAssetsWithChunking(assets, project, depth = 0) {
    if (!assets) return;
    
    if (assets.uri) {
      await this.indexAssetLightweight(assets, project);
      
      if (depth % 10 === 0) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }
    
    if (assets.children && Array.isArray(assets.children)) {
      for (let i = 0; i < assets.children.length; i++) {
        await this.indexAssetsWithChunking(assets.children[i], project, depth + 1);
      }
    }
  }

  async indexAssetLightweight(asset, project) {
    if (!asset || !asset.uri) return;
    
    const assetType = this.determineAssetType(asset);
    const extension = this.extractExtension(asset.uri);
    
    const searchableContent = [
      asset.name || this.getBasename(asset.uri),
      (asset.notes || []).map(note => note.content).join(' '),
      Object.values(asset.attributes || {}).join(' ')
    ].filter(part => part && part.trim()).join(' ');
    
    const tags = this.generateTags(searchableContent, assetType, extension);
    
    const doc = {
      id: this.generateDocumentId('asset', asset.uri),
      type: assetType,
      title: asset.name || this.getBasename(asset.uri),
      content: searchableContent,
      filename: this.getBasename(asset.uri),
      extension: extension,
      path: asset.uri,
      relativePath: this.getRelativePath(asset.uri, project.path),
      projectName: project.name,
      projectId: project.id,
      tags: tags,
      metadata: JSON.stringify({
        size: asset.size,
        lastModified: asset.lastModified,
        isContentIndexed: false,
        noteCount: asset.notes ? asset.notes.length : 0,
        attributeCount: asset.attributes ? Object.keys(asset.attributes).length : 0
      })
    };
    
    this.addToIndices(doc, ['main', 'files']);
    this.documentStore.set(doc.id, { 
      ...doc, 
      item: { 
        ...asset, 
        snippet: '',
        isContentIndexed: false,
        projectName: project.name 
      } 
    });

    if (asset.notes && Array.isArray(asset.notes)) {
      for (const note of asset.notes) {
        await this.indexNote(note, project, 'asset', asset.uri);
      }
    }
  }

  async indexExternalAssets(externalAssets, project) {
    if (!externalAssets || !externalAssets.children) return;
    
    for (const asset of externalAssets.children) {
      await this.indexExternalAsset(asset, project);
    }
  }

  async indexAsset(asset, project) {
    if (!asset || !asset.uri) return;
    
    const assetType = this.determineAssetType(asset);
    const extension = this.extractExtension(asset.uri);
    const isFile = assetType === 'file';
    
    let fileContent = '';
    let snippet = '';
    let isContentIndexed = false;
    
    if (isFile && this.isIndexableFile(asset.uri, extension)) {
      try {
        const result = await this.readFileContent(asset.uri, project.path);
        fileContent = result.content;
        snippet = result.snippet;
        isContentIndexed = result.success;
      } catch (error) {
        console.warn(`ElasticSearchService: Could not read file content for ${asset.uri}:`, error.message);
      }
    }
    
    const searchableContent = [
      asset.name || this.getBasename(asset.uri),
      fileContent,
      (asset.notes || []).map(note => note.content).join(' '),
      Object.values(asset.attributes || {}).join(' ')
    ].filter(part => part && part.trim()).join(' ');
    
    const tags = this.generateTags(searchableContent, assetType, extension);
    
    const doc = {
      id: this.generateDocumentId('asset', asset.uri),
      type: assetType,
      title: asset.name || this.getBasename(asset.uri),
      content: searchableContent,
      filename: this.getBasename(asset.uri),
      extension: extension,
      path: asset.uri,
      relativePath: this.getRelativePath(asset.uri, project.path),
      projectName: project.name,
      projectId: project.id,
      tags: tags,
      metadata: JSON.stringify({
        size: asset.size,
        lastModified: asset.lastModified,
        isContentIndexed,
        noteCount: asset.notes ? asset.notes.length : 0,
        attributeCount: asset.attributes ? Object.keys(asset.attributes).length : 0
      })
    };
    
    this.addToIndices(doc, ['main', 'files']);
    this.documentStore.set(doc.id, { 
      ...doc, 
      item: { 
        ...asset, 
        snippet,
        isContentIndexed,
        projectName: project.name 
      } 
    });

    if (asset.notes && Array.isArray(asset.notes)) {
      for (const note of asset.notes) {
        await this.indexNote(note, project, 'asset', asset.uri);
      }
    }
  }

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
      path: asset.uri,
      projectName: project.name,
      projectId: project.id,
      tags: tags,
      metadata: JSON.stringify({
        noteCount: asset.notes ? asset.notes.length : 0,
        attributeCount: asset.attributes ? Object.keys(asset.attributes).length : 0
      })
    };
    
    this.addToIndices(doc, ['main']);
    this.documentStore.set(doc.id, { 
      ...doc, 
      item: { 
        ...asset, 
        projectName: project.name 
      } 
    });

    if (asset.notes && Array.isArray(asset.notes)) {
      for (const note of asset.notes) {
        await this.indexNote(note, project, 'external-asset', asset.uri);
      }
    }
  }

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
      name: this.formatPersonName(person.name),
      affiliation: person.affiliation || '',
      roles: (person.roles || []).join(' '),
      notes: (person.notes || []).map(note => note.content).join(' '),
      projectName: project.name,
      projectId: project.id,
      tags: tags,
      metadata: JSON.stringify({
        id: person.id,
        roleCount: person.roles ? person.roles.length : 0,
        noteCount: person.notes ? person.notes.length : 0
      })
    };
    
    this.addToIndices(doc, ['main', 'people']);
    this.documentStore.set(doc.id, { 
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
      tags: tags,
      metadata: JSON.stringify({
        noteType: entityType,
        created: note.created,
        updated: note.updated,
        contentLength: note.content.length
      })
    };
    
    this.addToIndices(doc, ['main', 'notes']);
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
      projectName: project.name,
      projectId: project.id,
      tags: tags,
      metadata: JSON.stringify({
        id: group.id,
        assetCount: group.assets ? group.assets.length : 0,
        details: group.details
      })
    };
    
    this.addToIndices(doc, ['main']);
    this.documentStore.set(doc.id, { 
      ...doc, 
      item: { 
        ...group, 
        projectName: project.name 
      } 
    });
  }

  addToIndices(doc, indexNames = ['main']) {
    indexNames.forEach(indexName => {
      if (this.indices[indexName]) {
        try {
          this.indices[indexName].addDoc(doc);
          this.performanceStats.documentsIndexed++;
        } catch (error) {
          console.warn(`ElasticSearchService: Error adding document to ${indexName} index:`, error);
        }
      }
    });
  }

  isIndexableFile(filePath, extension) {
    if (!extension) {
      const basename = this.getBasename(filePath).toLowerCase();
      const textFiles = ['readme', 'license', 'changelog', 'makefile', 'dockerfile', 'gitignore'];
      if (textFiles.some(name => basename.includes(name))) {
        console.log(`ElasticSearchService: File ${filePath} recognized as text file without extension`);
        return true;
      }
      return false;
    }
    
    const indexableExtensions = [
      '.txt', '.text', '.md', '.markdown', '.rst', '.asciidoc',
      '.js', '.jsx', '.ts', '.tsx', '.json', '.json5',
      '.html', '.htm', '.xml', '.svg', '.css', '.scss', '.sass', '.less',
      '.py', '.pyw', '.r', '.rmd', '.rnw', '.snw',
      '.c', '.cpp', '.cxx', '.cc', '.h', '.hpp', '.hxx',
      '.java', '.scala', '.kt', '.go', '.rs', '.php', '.rb',
      '.sh', '.bash', '.zsh', '.fish', '.ps1', '.bat', '.cmd',
      '.do', '.ado', '.sas', '.sps', '.spv', '.stata', '.dta',
      '.ipynb', '.rdata', '.rds',
      '.csv', '.tsv', '.dat', '.tab', '.psv',
      '.yaml', '.yml', '.toml', '.ini', '.conf', '.config', '.cfg',
      '.properties', '.env', '.envrc',
      '.tex', '.bib', '.rtf', '.wiki',
      '.log', '.out', '.err', '.output',
      '.sql', '.sqlite', '.db',
      '.jsp', '.asp', '.aspx', '.php3', '.php4', '.php5',
      '.gitignore', '.gitattributes', '.gitmodules',
      '.hgignore', '.svnignore',
      '.makefile', '.cmake', '.gradle', '.maven', '.ant',
      '.dockerfile', '.containerfile',
      '.requirements', '.pipfile', '.poetry', '.conda',
      '.package', '.gemfile', '.podfile',
      '.pkl', '.pickle'
    ];
    
    const ext = extension.toLowerCase();
    const isIndexable = indexableExtensions.includes(ext);
    
    if (isIndexable) {
      console.log(`ElasticSearchService: File ${filePath} is indexable (${ext})`);
    } else {
      console.log(`ElasticSearchService: File ${filePath} extension ${ext} not in indexable list`);
    }
    
    return isIndexable;
  }

  extractExtension(filePath) {
    if (!filePath) return '';
    
    const basename = this.getBasename(filePath).toLowerCase();
    
    if (basename.includes('.ipynb')) {
      return '.ipynb';
    }
    
    const standardExt = path.extname(filePath).toLowerCase();
    if (standardExt) {
      return standardExt;
    }
    
    if (basename.includes('makefile')) return '.makefile';
    if (basename.includes('dockerfile')) return '.dockerfile';
    if (basename.includes('readme')) return '.readme';
    if (basename.includes('license')) return '.license';
    
    return '';
  }

  async readFileContent(filePath, projectPath) {
    const result = {
      content: '',
      snippet: '',
      success: false
    };
    
    try {
      const pathsToTry = [];
      
      if (path.isAbsolute(filePath)) {
        pathsToTry.push(filePath);
      } else {
        pathsToTry.push(path.join(projectPath, filePath));
        pathsToTry.push(path.resolve(projectPath, filePath));
        
        const cleanPath = filePath.replace(/^[\/\\]+/, '');
        pathsToTry.push(path.join(projectPath, cleanPath));
        
        pathsToTry.push(path.join(projectPath, path.basename(filePath)));
      }
      
      let actualPath = null;
      let stats = null;
      
      for (const tryPath of pathsToTry) {
        try {
          if (fs.existsSync(tryPath)) {
            const tryStats = fs.statSync(tryPath);
            if (tryStats.isFile()) {
              actualPath = tryPath;
              stats = tryStats;
              console.log(`ElasticSearchService: Found file at: ${actualPath}`);
              break;
            }
          }
        } catch (e) {
          // Continue to next path
        }
      }
      
      if (!actualPath) {
        console.warn(`ElasticSearchService: File not found anywhere: ${filePath}`);
        console.warn(`ElasticSearchService: Tried paths:`, pathsToTry);
        return result;
      }
      
      const maxFileSize = 50 * 1024 * 1024;
      
      if (stats.size > maxFileSize) {
        console.warn(`ElasticSearchService: File too large: ${actualPath} (${stats.size} bytes)`);
        return result;
      }
      
      if (stats.size === 0) {
        console.log(`ElasticSearchService: Empty file: ${actualPath}`);
        result.content = '';
        result.snippet = '';
        result.success = true;
        return result;
      }
      
      let content = '';
      try {
        console.log(`ElasticSearchService: READING FILE: ${actualPath}`);
        content = fs.readFileSync(actualPath, 'utf8');
        console.log(`ElasticSearchService: SUCCESS! Read ${content.length} characters from ${actualPath}`);
      } catch (readError) {
        console.error(`ElasticSearchService: UTF-8 read failed: ${readError.message}`);
        
        try {
          const buffer = fs.readFileSync(actualPath);
          content = buffer.toString('utf8');
          
          if (content.includes('\0')) {
            console.warn(`ElasticSearchService: Binary file, skipping: ${actualPath}`);
            return result;
          }
          
          console.log(`ElasticSearchService: SUCCESS via buffer! Read ${content.length} characters from ${actualPath}`);
        } catch (bufferError) {
          console.error(`ElasticSearchService: Buffer read also failed: ${bufferError.message}`);
          return result;
        }
      }
      
      content = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
      
      const snippetLength = 300;
      result.content = content;
      result.snippet = content.substring(0, snippetLength) + (content.length > snippetLength ? '...' : '');
      result.success = true;
      
      console.log(`ElasticSearchService: ✅ SUCCESSFULLY INDEXED CONTENT: ${filePath} (${content.length} chars)`);
      
    } catch (error) {
      console.error(`ElasticSearchService: MAJOR ERROR reading ${filePath}:`, error);
    }
    
    return result;
  }

  async forceIndexAllFiles(project) {
    console.log(`ElasticSearchService: FORCE INDEXING ALL FILES IN ${project.path}`);
    
    let totalFiles = 0;
    let indexedFiles = 0;
    
    const walkDir = (dir) => {
      try {
        const files = fs.readdirSync(dir);
        
        for (const file of files) {
          const fullPath = path.join(dir, file);
          
          try {
            const stat = fs.statSync(fullPath);
            
            if (stat.isDirectory()) {
              if (!['node_modules', '.git', '.statwrap', '__pycache__'].includes(file)) {
                walkDir(fullPath);
              }
            } else if (stat.isFile()) {
              totalFiles++;
              
              const relativePath = path.relative(project.path, fullPath);
              const extension = path.extname(file).toLowerCase();
              
              const textExtensions = [
                '.py', '.js', '.html', '.css', '.json', '.txt', '.md', '.csv',
                '.ipynb', '.r', '.sql', '.yaml', '.yml', '.xml', '.log'
              ];
              
              if (textExtensions.includes(extension) || file.toLowerCase().includes('readme')) {
                this.forceIndexSingleFile(fullPath, relativePath, project, stat);
                indexedFiles++;
              }
            }
          } catch (statError) {
            console.warn(`ElasticSearchService: Stat error for ${fullPath}: ${statError.message}`);
          }
        }
      } catch (readError) {
        console.warn(`ElasticSearchService: Read error for ${dir}: ${readError.message}`);
      }
    };
    
    walkDir(project.path);
    
    console.log(`ElasticSearchService: FORCE INDEX COMPLETE: ${indexedFiles}/${totalFiles} files indexed`);
  }

  async forceIndexSingleFile(fullPath, relativePath, project, stat) {
    try {
      console.log(`ElasticSearchService: FORCE INDEXING: ${relativePath}`);
      
      let content = '';
      try {
        content = fs.readFileSync(fullPath, 'utf8');
        console.log(`ElasticSearchService: ✅ READ ${content.length} chars from ${relativePath}`);
      } catch (readError) {
        console.error(`ElasticSearchService: ❌ Failed to read ${relativePath}: ${readError.message}`);
        return;
      }
      
      const extension = path.extname(relativePath).toLowerCase();
      const filename = path.basename(relativePath);
      
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
        tags: this.generateTags(content, 'file', extension),
        metadata: JSON.stringify({
          size: stat.size,
          lastModified: stat.mtime,
          isContentIndexed: true,
          source: 'force-index'
        })
      };
      
      this.addToIndices(doc, ['main', 'files']);
      
      this.documentStore.set(doc.id, { 
        ...doc, 
        item: { 
          uri: relativePath,
          name: filename,
          size: stat.size,
          lastModified: stat.mtime,
          snippet: content.substring(0, 300),
          isContentIndexed: true,
          projectName: project.name,
          fullPath: fullPath,
          type: 'file'
        } 
      });
      
      console.log(`ElasticSearchService: ✅ FORCE INDEXED: ${relativePath} with ${content.length} chars`);
      
    } catch (error) {
      console.error(`ElasticSearchService: FORCE INDEX ERROR for ${relativePath}:`, error);
    }
  }

  determineAssetType(asset) {
    if (asset.type) return asset.type;
    
    const extension = this.extractExtension(asset.uri);
    if (extension) return 'file';
    
    return 'folder';
  }

  getBasename(filePath) {
    if (!filePath) return '';
    return path.basename(filePath);
  }

  getRelativePath(filePath, projectPath) {
    if (!filePath || !projectPath) return filePath || '';
    
    try {
      return path.relative(projectPath, filePath);
    } catch (error) {
      return filePath;
    }
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

  search(query, options = {}) {
    if (!this.isInitialized) {
      console.warn('ElasticSearchService: Service not initialized');
      return this.getEmptyResults();
    }
    
    if (!query || typeof query !== 'string' || query.trim() === '') {
      return this.getEmptyResults();
    }
    
    const startTime = Date.now();
    const cacheKey = this.generateCacheKey(query, options);
    
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      this.cacheHits = (this.cacheHits || 0) + 1;
      
      const searchTime = Date.now() - startTime;
      this.updateSearchStats(searchTime, query, cached.all ? cached.all.length : 0, true);
      
      console.log('ElasticSearchService: Returning cached results');
      return cached;
    }
    
    this.cacheMisses = (this.cacheMisses || 0) + 1;
    
    try {
      const searchResults = this.performSearch(query, options);
      const groupedResults = this.groupResultsByType(searchResults);
      
      const searchTime = Date.now() - startTime;
      this.updateSearchStats(searchTime, query, searchResults.length, false);
      
      this.addToCache(cacheKey, groupedResults);
      
      console.log(`ElasticSearchService: Search completed in ${searchTime}ms, found ${searchResults.length} results`);
      
      return groupedResults;
      
    } catch (error) {
      console.error('ElasticSearchService: Search error:', error);
      
      const searchTime = Date.now() - startTime;
      this.updateSearchStats(searchTime, query, 0, false);
      
      return this.getEmptyResults();
    }
  }

  performSearch(query, options = {}) {
    const {
      type,
      projectId,
      maxResults = SearchConfig?.search?.maxResults || 1000,
      fuzzy = SearchConfig?.search?.enableFuzzySearch || true,
      fields = {}
    } = options;
    
    const cacheKey = this.generateCacheKey(query, options);
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      this.cacheHits = (this.cacheHits || 0) + 1;
      console.log('ElasticSearchService: Returning cached results');
      return cached;
    }
    this.cacheMisses = (this.cacheMisses || 0) + 1;
    
    const searchConfig = {
      bool: 'OR',
      expand: true,
      fields: {
        title: { boost: 3 },
        content: { boost: 1 },
        tags: { boost: 2 },
        ...fields
      }
    };
    
    if (fuzzy) {
      searchConfig.bool = 'AND';
    }
    
    const results = this.indices.main.search(query, searchConfig);
    
    let filteredResults = results
      .slice(0, maxResults)
      .map(result => this.enrichSearchResult(result))
      .filter(result => result !== null);
    
    if (type && type !== 'all') {
      filteredResults = filteredResults.filter(result => result.type === type);
    }
    
    if (projectId && projectId !== 'all') {
      filteredResults = filteredResults.filter(result => 
        result.item && result.item.projectId === projectId
      );
    }
    
    filteredResults.sort((a, b) => (b.score || 0) - (a.score || 0));
    
    return filteredResults;
  }

  enrichSearchResult(result) {
    const docData = this.documentStore.get(result.ref);
    if (!docData) {
      console.warn(`ElasticSearchService: Document not found in store: ${result.ref}`);
      return null;
    }
    
    const relevanceScore = this.calculateRelevancePercentage(result.score, docData);
    
    return {
      score: relevanceScore,
      originalScore: result.score,
      type: docData.type,
      item: docData.item,
      highlights: this.generateHighlights(docData, result)
    };
  }

  calculateRelevancePercentage(rawScore, docData) {
    if (!rawScore || rawScore <= 0) return 0.05;
    
    let normalizedScore = Math.log10(rawScore + 1) / Math.log10(11);
    
    const typeWeights = {
      'project': 1.0,
      'file': 0.95,
      'person': 0.9,
      'note': 0.85,
      'asset': 0.8,
      'external-asset': 0.75,
      'folder': 0.7
    };
    
    const typeWeight = typeWeights[docData.type] || 0.6;
    normalizedScore *= typeWeight;
    
    let contentBonus = 0;
    if (docData.item) {
      if (docData.item.isContentIndexed) {
        contentBonus += 0.1;
      }
      
      if (docData.item.snippet && docData.item.snippet.length > 100) {
        contentBonus += 0.05;
      }
      
      if (docData.item.lastModified) {
        const daysSinceModified = (Date.now() - new Date(docData.item.lastModified).getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceModified < 30) {
          contentBonus += 0.05;
        }
      }
    }
    
    normalizedScore += contentBonus;
    
    normalizedScore = 1 - Math.exp(-normalizedScore * 3);
    
    normalizedScore = Math.max(0.05, Math.min(0.90, normalizedScore));
    
    return normalizedScore;
  }

  generateHighlights(docData, result) {
    const highlights = {};
    
    if (docData.content && result.score > 0.1) {
      highlights.content = [docData.content.substring(0, 200)];
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

  advancedSearch(query, options = {}) {
    if (!this.isInitialized) {
      console.warn('ElasticSearchService: Service not initialized');
      return this.getEmptyResults();
    }
    
    const startTime = Date.now();
    
    try {
      const parsedQuery = this.parseSearchQuery(query);
      
      const results = [];
      
      const mainResults = this.performSearch(parsedQuery.query, {
        ...options,
        fields: parsedQuery.fieldBoosts
      });
      results.push(...mainResults);
      
      if (!parsedQuery.fieldRestrictions.length) {
        if (this.indices.projects) {
          const projectResults = this.searchSpecializedIndex('projects', parsedQuery.query, options);
          results.push(...projectResults);
        }
        
        if (this.indices.files) {
          const fileResults = this.searchSpecializedIndex('files', parsedQuery.query, options);
          results.push(...fileResults);
        }
      }
      
      const uniqueResults = this.removeDuplicateResults(results);
      const groupedResults = this.groupResultsByType(uniqueResults);
      
      const searchTime = Date.now() - startTime;
      this.updateSearchStats(searchTime, query, uniqueResults.length, false);
      
      return groupedResults;
      
    } catch (error) {
      console.error('ElasticSearchService: Advanced search error:', error);
      
      const searchTime = Date.now() - startTime;
      this.updateSearchStats(searchTime, query, 0, false);
      
      return this.getEmptyResults();
    }
  }

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
    
    const fieldPattern = /(\w+):(\w+)/g;
    let match;
    while ((match = fieldPattern.exec(query)) !== null) {
      const [fullMatch, field, value] = match;
      parsed.fieldRestrictions.push({ field, value });
      processedQuery = processedQuery.replace(fullMatch, value);
    }
    
    const requiredPattern = /\+(\w+)/g;
    while ((match = requiredPattern.exec(processedQuery)) !== null) {
      parsed.requiredTerms.push(match[1]);
      processedQuery = processedQuery.replace(match[0], match[1]);
    }
    
    const excludedPattern = /-(\w+)/g;
    while ((match = excludedPattern.exec(processedQuery)) !== null) {
      parsed.excludedTerms.push(match[1]);
      processedQuery = processedQuery.replace(match[0], '');
    }
    
    parsed.query = processedQuery.trim();
    return parsed;
  }

  searchSpecializedIndex(indexName, query, options = {}) {
    if (!this.indices[indexName]) return [];
    
    try {
      const results = this.indices[indexName].search(query, {
        bool: 'OR',
        expand: true
      });
      
      return results
        .slice(0, options.maxResults || 100)
        .map(result => this.enrichSearchResult(result))
        .filter(result => result !== null);
        
    } catch (error) {
      console.warn(`ElasticSearchService: Error searching ${indexName} index:`, error);
      return [];
    }
  }

  removeDuplicateResults(results) {
    const seen = new Set();
    return results.filter(result => {
      const key = result.item?.id || result.item?.uri || JSON.stringify(result.item);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  getSuggestions(partialQuery) {
    if (!this.isInitialized || !partialQuery || partialQuery.length < 1) {
      return [];
    }
    
    const suggestions = new Set();
    const maxSuggestions = SearchConfig?.ui?.maxSuggestions || 8;
    
    this.documentStore.forEach((doc) => {
      if (suggestions.size >= maxSuggestions) return;
      
      if (doc.title && doc.title.toLowerCase().includes(partialQuery.toLowerCase())) {
        suggestions.add(doc.title);
      }
      
      if (doc.tags && Array.isArray(doc.tags)) {
        doc.tags.forEach(tag => {
          if (tag.toLowerCase().includes(partialQuery.toLowerCase())) {
            suggestions.add(tag);
          }
        });
      }
    });
    
    return Array.from(suggestions).slice(0, maxSuggestions);
  }

  queueProjectForContentIndexing(project) {
    console.log(`ElasticSearchService: Complete indexing already done for ${project.name}, skipping queue`);
  }

  async processIndexingQueue() {
    if (this.indexingQueue.length === 0) return;
    
    console.log(`ElasticSearchService: Processing ${this.indexingQueue.length} remaining items in queue`);
    
    this.indexingQueue.length = 0;
    this.indexingInProgress = false;
    
    console.log('ElasticSearchService: Queue cleared - full indexing already completed');
  }

  async indexAssetsFullContent(assets, project, processed = new Set()) {
    if (!assets || !assets.uri) return;
    
    const docId = this.generateDocumentId('asset', assets.uri);
    
    if (processed.has(docId)) return;
    processed.add(docId);
    
    const assetType = this.determineAssetType(assets);
    const extension = this.extractExtension(assets.uri);
    const isFile = assetType === 'file';
    
    let fileContent = '';
    let snippet = '';
    let isContentIndexed = false;
    
    if (isFile && this.isIndexableFile(assets.uri, extension)) {
      try {
        const result = await this.readFileContent(assets.uri, project.path);
        fileContent = result.content;
        snippet = result.snippet;
        isContentIndexed = result.success;
        
        const existingDoc = this.documentStore.get(docId);
        if (existingDoc) {
          const updatedContent = [
            existingDoc.item.name || this.getBasename(assets.uri),
            fileContent,
            (assets.notes || []).map(note => note.content).join(' '),
            Object.values(assets.attributes || {}).join(' ')
          ].filter(part => part && part.trim()).join(' ');
          
          const updatedDoc = {
            ...existingDoc,
            content: updatedContent,
            metadata: JSON.stringify({
              ...JSON.parse(existingDoc.metadata),
              isContentIndexed
            })
          };
          
          this.indices.main.removeDoc(updatedDoc);
          this.indices.files.removeDoc(updatedDoc);
          this.addToIndices(updatedDoc, ['main', 'files']);
          
          existingDoc.item.snippet = snippet;
          existingDoc.item.isContentIndexed = isContentIndexed;
          this.documentStore.set(docId, existingDoc);
        }
        
      } catch (error) {
        console.warn(`ElasticSearchService: Could not read file content for ${assets.uri}:`, error.message);
      }
    }
    
    if (assets.children && Array.isArray(assets.children)) {
      for (let i = 0; i < assets.children.length; i++) {
        await this.indexAssetsFullContent(assets.children[i], project, processed);
        
        if (i % 5 === 0) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }
    }
  }

  async reindexAll() {
    console.log('ElasticSearchService: Starting complete reindex');
    
    this.clearIndices();
    this.indexingQueue.length = 0;
    this.indexingInProgress = true;
    
    await this.indexProjectsInChunks(this.projectsData);
    
    this.indexingInProgress = false;
    console.log('ElasticSearchService: Complete reindex finished');
    
    const stats = this.getSearchStats();
    console.log('ElasticSearchService: Reindex Summary:');
    Object.entries(stats.documentsByType).forEach(([type, count]) => {
      console.log(`  ${type}: ${count} documents`);
    });
    console.log(`  Content-indexed files: ${stats.contentIndexedFiles}`);
  }

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

  importIndex(indexData) {
    if (!indexData || indexData.version !== '1.0') {
      throw new Error('Invalid or unsupported index data format');
    }
    
    console.log('ElasticSearchService: Importing index data');
    
    this.clearIndices();
    
    this.documentStore = new Map(indexData.documentStore);
    
    this.documentStore.forEach(doc => {
      const indexNames = this.getIndexNamesForType(doc.type);
      this.addToIndices(doc, indexNames);
    });
    
    if (indexData.performanceStats) {
      this.performanceStats = { ...this.performanceStats, ...indexData.performanceStats };
    }
    
    console.log('ElasticSearchService: Index import completed');
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

  updateSearchStats(searchTime, query = '', resultCount = 0, wasCached = false) {
    this.performanceStats.totalSearches++;
    
    this.performanceStats.searchTimes.push(searchTime);
    
    if (this.performanceStats.searchTimes.length > 100) {
      this.performanceStats.searchTimes = this.performanceStats.searchTimes.slice(-100);
    }
    
    const sum = this.performanceStats.searchTimes.reduce((a, b) => a + b, 0);
    this.performanceStats.averageSearchTime = Math.round(sum / this.performanceStats.searchTimes.length);
    
    if (!this.performanceStats.recentSearches) {
      this.performanceStats.recentSearches = [];
    }
    
    this.performanceStats.recentSearches.unshift({
      query: query.substring(0, 50),
      searchTime,
      resultCount,
      wasCached,
      timestamp: Date.now()
    });
    
    if (this.performanceStats.recentSearches.length > 20) {
      this.performanceStats.recentSearches = this.performanceStats.recentSearches.slice(0, 20);
    }
    
    console.log(`ElasticSearchService: Search #${this.performanceStats.totalSearches} completed in ${searchTime}ms (avg: ${this.performanceStats.averageSearchTime}ms)`);
  }

  calculateCacheHitRate() {
    if (!this.cacheHits && !this.cacheMisses) return 0;
    const totalRequests = (this.cacheHits || 0) + (this.cacheMisses || 0);
    if (totalRequests === 0) return 0;
    return Math.round(((this.cacheHits || 0) / totalRequests) * 100);
  }

  formatTime(ms) {
    if (!ms || ms < 1000) return `${Math.round(ms)}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
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
    
    let indexingSpeed = 0;
    if (this.performanceStats.totalIndexingTime > 0 && this.performanceStats.documentsIndexed > 0) {
      indexingSpeed = (this.performanceStats.documentsIndexed / (this.performanceStats.totalIndexingTime / 1000));
    }
    
    return {
      totalDocuments: this.documentStore.size,
      documentsByType: docsByType,
      contentIndexedFiles: contentIndexedCount,
      indexedProjects: this.projectsData.length,
      indexingInProgress: this.indexingInProgress,
      queueLength: this.indexingQueue.length,
      performance: {
        ...this.performanceStats,
        indexingSpeed: Math.round(indexingSpeed * 100) / 100,
        totalIndexingTimeFormatted: this.formatTime(this.performanceStats.totalIndexingTime),
        averageSearchTimeFormatted: this.formatTime(this.performanceStats.averageSearchTime)
      },
      cache: {
        size: this.resultCache.size,
        maxSize: this.maxCacheSize,
        hitRate: this.calculateCacheHitRate()
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

  trackIndexingOperation(startTime, documentsAdded, operationType = 'general') {
    const indexingTime = Date.now() - startTime;
    this.performanceStats.totalIndexingTime += indexingTime;
    this.performanceStats.documentsIndexed += documentsAdded;
    
    if (!this.performanceStats.recentIndexing) {
      this.performanceStats.recentIndexing = [];
    }
    
    this.performanceStats.recentIndexing.unshift({
      timestamp: Date.now(),
      duration: indexingTime,
      documentsAdded,
      operationType,
      documentsPerSecond: documentsAdded / (indexingTime / 1000)
    });
    
    if (this.performanceStats.recentIndexing.length > 20) {
      this.performanceStats.recentIndexing = this.performanceStats.recentIndexing.slice(0, 20);
    }
    
    console.log(`ElasticSearchService: ${operationType} indexing completed - ${documentsAdded} docs in ${indexingTime}ms (${(documentsAdded / (indexingTime / 1000)).toFixed(2)} docs/sec)`);
  }

  isReady() {
    return this.isInitialized && !this.indexingInProgress;
  }

  getStatus() {
    return {
      initialized: this.isInitialized,
      indexingInProgress: this.indexingInProgress,
      queueLength: this.indexingQueue.length,
      totalDocuments: this.documentStore.size,
      cacheSize: this.resultCache.size
    };
  }

  clearCaches() {
    this.resultCache.clear();
    this.cacheHits = 0;
    this.cacheMisses = 0;
    console.log('ElasticSearchService: Caches cleared and counters reset');
  }

  cleanup() {
    this.clearIndices();
    this.clearCaches();
    this.indexingQueue.length = 0;
    this.indexingInProgress = false;
    this.isInitialized = false;
    console.log('ElasticSearchService: Cleanup completed');
  }
}

const elasticSearchServiceInstance = new ElasticSearchService();

export default elasticSearchServiceInstance;