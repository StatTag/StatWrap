

const assetsConfig = require('./assets-config');

// Extract extensions from your existing content types for indexing
const getIndexableExtensions = () => {
  const extensions = [];
  
  assetsConfig.contentTypes.forEach(contentType => {
    extensions.push(...contentType.extensions.map(ext => `.${ext}`));
  });
  
  // Add additional extensions for comprehensive search indexing
  const additionalExtensions = [
    '.log', '.out', '.err', '.ini', '.conf', '.config', '.env',
    '.tex', '.bib', '.rtf', '.yaml', '.yml', '.sql', '.sqlite', '.db',
    '.readme', '.changelog', '.license', '.gitignore', '.gitattributes',
    '.editorconfig', '.eslintrc', '.prettierrc', '.babelrc',
    '.dockerfile', '.dockerignore', '.makefile', '.cmake',
    '.requirements', '.pipfile', '.poetry', '.conda',
    '.rproj', '.rdata', '.rds', '.rhistory'
  ];
  
  return [...new Set([...extensions, ...additionalExtensions])];
};

// Get statistical analysis file patterns
const getStatisticalPatterns = () => {
  return {
    r: {
      extensions: ['.r', '.rmd', '.rnw', '.snw'],
      patterns: ['library(', 'require(', 'ggplot', 'dplyr', 'tidyr', 'lm(', 'glm(', 'aov('],
      tags: ['r-analysis', 'statistical-computing', 'data-science']
    },
    python: {
      extensions: ['.py', '.ipynb', '.pyw'],
      patterns: ['import pandas', 'import numpy', 'sklearn', 'matplotlib', 'seaborn', 'scipy'],
      tags: ['python-analysis', 'data-science', 'machine-learning']
    },
    sas: {
      extensions: ['.sas', '.sas7bdat'],
      patterns: ['proc ', 'data ', 'run;', 'quit;'],
      tags: ['sas-analysis', 'enterprise-statistics']
    },
    stata: {
      extensions: ['.do', '.ado', '.dta'],
      patterns: ['regress', 'summarize', 'tabulate', 'generate'],
      tags: ['stata-analysis', 'econometrics']
    },
    spss: {
      extensions: ['.sps', '.spv', '.sav'],
      patterns: ['COMPUTE', 'REGRESSION', 'FREQUENCIES'],
      tags: ['spss-analysis', 'survey-research']
    }
  };
};

module.exports = {
  // File indexing settings
  indexing: {
    // Maximum file size to index (in bytes) - 10MB for better coverage
    maxFileSize: 10 * 1024 * 1024,
    indexableExtensions: getIndexableExtensions(),
    excludeDirectories: [
      'node_modules',
      '.git',
      '.svn',
      '.hg',
      '__pycache__',
      '.pytest_cache',
      '.venv',
      'venv',
      'env',
      'ENV',
      'build',
      'dist',
      '.next',
      '.nuxt',
      'target',
      'bin',
      'obj',
      '.gradle',
      '.mvn',
      '.idea',
      '.vscode',
      '.vs',
      'coverage',
      '.coverage',
      '.nyc_output',
      '.statwrap', //  StatWrap metadata directory
      'Rcheck',
      '.Rproj.user',
      'packrat',
      'renv'
    ],
    
    // Files to exclude from indexing
    excludeFiles: [
      '.DS_Store',
      'Thumbs.db',
      '*.tmp',
      '*.temp',
      '*.swp',
      '*.swo',
      '*~',
      '*.bak',
      '*.backup',
      '*.orig',
      '*.rej',
      '.gitkeep',
      '.keep'
    ],
    
    // Batch processing settings
    batchSize: process.env.NODE_ENV === 'development' ? 50 : 100,
    batchDelay: process.env.NODE_ENV === 'development' ? 100 : 50,
    
    // Memory management
    maxConcurrentReads: 5,
    fileReadTimeout: 5000 // 5 seconds
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
      'model', 'regression', 'statistical', 'significance',
      'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'from', 'up', 'about', 'into', 'through', 'during'
    ],
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
      image: 0.5,
      archive: 0.4
    },
    
    // Advanced scoring features
    enableRecencyBoost: true,
    recencyBoostFactor: 0.1,
    recencyThresholdDays: 30,
    exactMatchBoost: 2.0,
    lengthPenaltyThreshold: 10000,
    lengthPenaltyFactor: 0.9,
    
    // Content quality scoring
    contentQualityFactors: {
      hasDescription: 1.1,
      hasNotes: 1.05,
      hasAttributes: 1.05,
      isContentIndexed: 1.2,
      hasMetadata: 1.1
    },
    
    // Statistical file specific boosts
    statisticalFileBoost: {
      '.r': 1.2,
      '.rmd': 1.15,
      '.py': 1.15,
      '.ipynb': 1.2,
      '.sas': 1.1,
      '.do': 1.1,
      '.sps': 1.1,
      '.sql': 1.05
    }
  },
  
  // Tag extraction and management
  tagging: {
    enableAutoTagging: true,
    maxTagsPerDocument: 20,
    minTagLength: 2,
    maxTagLength: 50,
    
    // Automatic tag sources
    tagSources: {
      fileExtension: true,
      contentType: true,
      folderNames: true,
      fileName: true,
      contentAnalysis: true,
      projectCategories: true
    },
    
    // Statistical content patterns for auto-tagging
    statisticalPatterns: getStatisticalPatterns(),
    
    // Common research/analysis tags
    commonTags: {
      methodology: ['experimental', 'observational', 'survey', 'case-study', 'meta-analysis'],
      analysis: ['descriptive', 'inferential', 'exploratory', 'confirmatory', 'predictive'],
      dataTypes: ['categorical', 'numerical', 'ordinal', 'nominal', 'binary', 'continuous'],
      techniques: ['regression', 'clustering', 'classification', 'time-series', 'survival-analysis'],
      software: ['r', 'python', 'sas', 'stata', 'spss', 'excel', 'sql', 'tableau']
    }
  },
  
  // UI and display settings
  ui: {
    searchHistorySize: 15,
    enableSuggestions: true,
    maxSuggestions: 8,
    snippetLength: 200,
    snippetContext: 75,
    enableHighlighting: true,
    groupResultsByType: true,
    showRelevanceScores: process.env.NODE_ENV === 'development',
    enableKeyboardShortcuts: true,
    
    shortcuts: {
      search: 'Ctrl+K',
      clearSearch: 'Escape',
      nextResult: 'ArrowDown',
      prevResult: 'ArrowUp',
      openResult: 'Enter',
      toggleAdvanced: 'Ctrl+Shift+F'
    },
    
    // Result display preferences
    resultDisplay: {
      showTags: true,
      showMetadata: true,
      showSnippets: true,
      showFileSize: true,
      showLastModified: true,
      maxTagsToShow: 5,
      enableThumbnails: false
    }
  },
  
  // Performance settings
  performance: {
    indexingBatchSize: process.env.NODE_ENV === 'development' ? 50 : 100,
    indexingBatchDelay: process.env.NODE_ENV === 'development' ? 100 : 50,
    showIndexingProgress: true,
    enableResultCaching: true,
    resultCacheSize: 100,
    resultCacheTTL: 10 * 60 * 1000, // 10 minutes
    enableAnalytics: process.env.NODE_ENV === 'development',
    
    // Memory management
    maxMemoryUsage: 512 * 1024 * 1024, // 512MB
    gcThreshold: 1000, // documents processed before GC
    enableMemoryMonitoring: process.env.NODE_ENV === 'development'
  },
  
  // Advanced features for statistical projects
  advanced: {
    enableSearchOperators: true,
    enableRegexSearch: process.env.NODE_ENV === 'development',
    enableProjectFiltering: true,
    enableDateFiltering: true,
    enableFileTypeFiltering: true,
    enableSizeFiltering: true,
    enableTagFiltering: true,
    indexFileMetadata: true,
    indexImageMetadata: false,
    indexDocumentProperties: true,
    enableContentPreview: true,
    maxPreviewLines: 25,
    
    // Search operators
    operators: {
      required: '+',
      excluded: '-',
      phrase: '"',
      field: ':',
      wildcard: '*',
      fuzzy: '~',
      boost: '^'
    },
    
    // Field-specific search
    searchableFields: {
      type: ['project', 'file', 'folder', 'person', 'asset', 'note'],
      ext: 'file_extension',
      project: 'project_name',
      size: 'file_size',
      modified: 'last_modified',
      tag: 'tags',
      content: 'full_content'
    },
    
    // Statistical file specific settings
    statisticalFileHandling: {
      // Special handling for R/Python/SAS/Stata files
      indexCodeComments: true,
      indexVariableNames: true,
      indexFunctionNames: true,
      indexLibraryImports: true,
      
      // Special handling for data files
      indexDataHeaders: true,
      maxDataPreviewRows: 15,
      detectDataTypes: true,
      
      // Code analysis
      enableSyntaxHighlighting: false,
      detectCodePatterns: true,
      extractCodeMetrics: true
    },
    
    // Content analysis
    contentAnalysis: {
      enableLanguageDetection: true,
      enableSentimentAnalysis: false,
      enableKeywordExtraction: true,
      maxKeywords: 10,
      keywordMinFrequency: 2
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
        fileTypes: ['.r', '.rmd', '.rnw', '.snw'],
        enabled: true
      },
      
      // Jupyter for Python notebooks
      jupyter: {
        name: 'Jupyter',
        command: 'jupyter',
        args: ['notebook', '{{filePath}}'],
        fileTypes: ['.ipynb'],
        enabled: true
      },
      
      // VSCode for various file types
      vscode: {
        name: 'VS Code',
        command: 'code',
        args: ['{{filePath}}'],
        fileTypes: ['.py', '.js', '.ts', '.json', '.md', '.sql'],
        enabled: true
      },
      
      // File manager
      fileManager: {
        name: 'System Default',
        command: 'system',
        args: []
      }
    },
    
    // Export/Import capabilities
    export: {
      enableIndexExport: true,
      enableResultsExport: true,
      supportedFormats: ['json', 'csv', 'xlsx'],
      includeMetadata: true
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
      
      // Fallback categorization
      const ext = extension.toLowerCase();
      if (['.r', '.rmd', '.py', '.ipynb', '.sas', '.do', '.sps'].includes(ext)) {
        return 'analysis-code';
      }
      if (['.csv', '.xlsx', '.json', '.xml', '.dta', '.sav'].includes(ext)) {
        return 'data';
      }
      if (['.md', '.txt', '.pdf', '.docx', '.html'].includes(ext)) {
        return 'documentation';
      }
      if (['.png', '.jpg', '.jpeg', '.gif', '.svg', '.pdf'].includes(ext)) {
        return 'visualization';
      }
      
      return 'other';
    },
    
    // Get content type name for display
    getContentTypeName: (extension) => {
      const contentType = assetsConfig.contentTypes.find(ct => 
        ct.extensions.includes(extension.toLowerCase().replace('.', ''))
      );
      
      return contentType ? contentType.name : 'Unknown';
    },
    
    // Get content type icon
    getContentTypeIcon: (extension) => {
      const category = this.getSearchCategory(extension);
      const iconMap = {
        'analysis-code': 'code',
        'data': 'storage',
        'documentation': 'description',
        'visualization': 'insert_chart',
        'other': 'insert_drive_file'
      };
      
      return iconMap[category] || iconMap.other;
    }
  },
  
  // Quality assurance and validation
  validation: {
    enableIndexValidation: true,
    validateOnStartup: process.env.NODE_ENV === 'development',
    maxValidationErrors: 100,
    
    // Data quality checks
    qualityChecks: {
      checkDuplicateDocuments: true,
      checkMissingFields: true,
      checkFieldTypes: true,
      checkIndexConsistency: true
    }
  },
  
  // Logging and debugging
  logging: {
    enableSearchLogging: process.env.NODE_ENV === 'development',
    enablePerformanceLogging: true,
    enableErrorLogging: true,
    logLevel: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
    
    // Performance monitoring
    monitoredMetrics: [
      'search_time',
      'index_time',
      'memory_usage',
      'cache_hit_rate',
      'query_frequency'
    ]
  }
};