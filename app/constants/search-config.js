// StatWrap Enhanced Search Configuration
// Based on your existing assets-config.js structure

const assetsConfig = require('./assets-config');

// Extract extensions from your existing content types for indexing
const getIndexableExtensions = () => {
  const extensions = [];
  
  assetsConfig.contentTypes.forEach(contentType => {
    extensions.push(...contentType.extensions.map(ext => `.${ext}`));
  });
  
  // Add additional extensions for search indexing
  const additionalExtensions = [
    '.log', '.out', '.err', '.ini', '.conf', '.config', '.env',
    '.tex', '.bib', '.rtf', '.yaml', '.yml', '.sql', '.sqlite', '.db'
  ];
  
  return [...new Set([...extensions, ...additionalExtensions])];
};

module.exports = {
  // File indexing settings
  indexing: {
    // Maximum file size to index (in bytes) - 5MB
    maxFileSize: 5 * 1024 * 1024,
    
    // Use your existing content type extensions plus additional ones
    indexableExtensions: getIndexableExtensions(),
    
    // Directories to exclude from indexing
    excludeDirectories: [
      'node_modules',
      '.git',
      '.svn',
      '.hg',
      '__pycache__',
      '.venv',
      'venv',
      'env',
      'build',
      'dist',
      '.next',
      '.nuxt',
      'target',
      'bin',
      'obj',
      '.statwrap' // Your StatWrap metadata directory
    ],
    
    // Files to exclude from indexing
    excludeFiles: [
      '.DS_Store',
      'Thumbs.db',
      '*.tmp',
      '*.temp',
      '*.swp',
      '*.swo',
      '*~'
    ]
  },
  
  // Search behavior settings
  search: {
    minQueryLength: 2,
    maxResults: 1000,
    resultsPerPage: 50,
    debounceTime: 300,
    enableFuzzySearch: true,
    fuzzyThreshold: 0.3,
    enableStemming: true,
    enableStopWordFilter: true,
    
    // Statistical analysis specific stop words
    customStopWords: [
      'analysis', 'data', 'dataset', 'variable', 'observation',
      'model', 'regression', 'statistical', 'significance'
    ]
  },
  
  // Result scoring and ranking
  scoring: {
    fieldWeights: {
      title: 10,
      content: 1,
      type: 5,
      projectName: 3,
      path: 2,
      tags: 8,
      metadata: 4
    },
    
    // Type-specific score multipliers based on StatWrap content types
    typeWeights: {
      project: 1.0,
      file: 0.9,
      folder: 0.8,
      person: 0.9,
      asset: 0.8,
      note: 0.7,
      'external-asset': 0.6,
      // Content type specific weights
      code: 0.95,      // R, Python, SAS, Stata files are important
      data: 0.9,       // Data files are very relevant
      documentation: 0.7,
      image: 0.5
    },
    
    enableRecencyBoost: true,
    recencyBoostFactor: 0.1,
    recencyThresholdDays: 30,
    exactMatchBoost: 2.0,
    lengthPenaltyThreshold: 10000,
    lengthPenaltyFactor: 0.9
  },
  
  // UI and display settings
  ui: {
    searchHistorySize: 10,
    enableSuggestions: true,
    maxSuggestions: 5,
    snippetLength: 150,
    snippetContext: 50,
    enableHighlighting: true,
    groupResultsByType: true,
    showRelevanceScores: process.env.NODE_ENV === 'development',
    enableKeyboardShortcuts: true,
    
    shortcuts: {
      search: 'Ctrl+K',
      clearSearch: 'Escape',
      nextResult: 'ArrowDown',
      prevResult: 'ArrowUp',
      openResult: 'Enter'
    }
  },
  
  // Performance settings
  performance: {
    indexingBatchSize: process.env.NODE_ENV === 'development' ? 50 : 100,
    indexingBatchDelay: process.env.NODE_ENV === 'development' ? 100 : 50,
    showIndexingProgress: true,
    enableResultCaching: true,
    resultCacheSize: 50,
    resultCacheTTL: 5 * 60 * 1000, // 5 minutes
    enableAnalytics: process.env.NODE_ENV === 'development'
  },
  
  // Advanced features for statistical projects
  advanced: {
    enableSearchOperators: true,
    enableRegexSearch: process.env.NODE_ENV === 'development',
    enableProjectFiltering: true,
    enableDateFiltering: true,
    enableFileTypeFiltering: true,
    enableSizeFiltering: true,
    indexFileMetadata: true,
    indexImageMetadata: false,
    indexDocumentProperties: true,
    enableContentPreview: true,
    maxPreviewLines: 20,
    
    // Statistical file specific settings
    statisticalFileHandling: {
      // Special handling for R/Python/SAS/Stata files
      indexCodeComments: true,
      indexVariableNames: true,
      indexFunctionNames: true,
      
      // Special handling for data files
      indexDataHeaders: true,
      maxDataPreviewRows: 10
    }
  },
  
  // Integration settings
  integration: {
    enableExternalTools: true,
    
    externalTools: {
      // Default text editors for different file types
      textEditor: {
        name: 'System Default',
        command: 'system',
        args: ['{{filePath}}']
      },
      
      // R Studio for R files
      rStudio: {
        name: 'RStudio',
        command: 'rstudio',
        args: ['{{filePath}}'],
        fileTypes: ['.r', '.rmd', '.rnw', '.snw']
      },
      
      // File manager
      fileManager: {
        name: 'System Default',
        command: 'system',
        args: []
      }
    }
  },
  
  // StatWrap specific content type mappings
  contentTypeMapping: {
    // Map your content types to search categories
    getSearchCategory: (extension) => {
      const contentType = assetsConfig.contentTypes.find(ct => 
        ct.extensions.includes(extension.toLowerCase().replace('.', ''))
      );
      
      if (contentType) {
        return contentType.categories[0]; // Use first category
      }
      
      return 'other';
    },
    
    // Get content type name for display
    getContentTypeName: (extension) => {
      const contentType = assetsConfig.contentTypes.find(ct => 
        ct.extensions.includes(extension.toLowerCase().replace('.', ''))
      );
      
      return contentType ? contentType.name : 'Unknown';
    }
  }
};