module.exports = {
  // File indexing settings
  indexing: {
    maxFileSize: 0.1* 1024 * 1024,
  },
  
  // Search settings
  search: {
    maxResults: 100,
    enableFuzzySearch: true,
    depth: 3,
    resolution: 5,
    fuzzySearchThreshold: 3,
    preprocessing: {
      enableStopWords: true,
      preserveOriginalQuery: false, 
      minWordLength: 2,
      
      // Stop words to remove from queries for better searching (keywords) : can be modified.
      stopWords: [
        'a', 'an', 'the',
        'in', 'on', 'at', 'by', 'for', 'with', 'to', 'from', 'of', 'about', 
        'into', 'through', 'during', 'before', 'after', 'above', 'below', 
        'up', 'down', 'out', 'off', 'over', 'under', 'again', 'further', 'and', 'or', 'but', 'so', 'yet', 'nor',  
        // Common verbs 
        'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 
        'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
        // Pronouns
        'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 
        'us', 'them', 'my', 'your', 'his', 'its', 'our', 'their',
        // Common adjectives/adverbs 
        'this', 'that', 'these', 'those', 'some', 'any', 'all', 'each',
        'very', 'more', 'most', 'other', 'such', 'no', 'not', 'only',
        'own', 'same', 'few', 'much', 'many',
        // Wh words 
        'what', 'where', 'when', 'why', 'how', 'which', 'who', 'whom',
        // Common filler words
        'just', 'also', 'even', 'still', 'well', 'back', 'way', 'know',
        'think', 'see', 'get', 'go', 'come', 'take', 'make', 'give',
        'use',  'want', 'need', 'try', 'work', 'call', 'ask'
      ],
      
      technicalStopWords: [
        'project','search','find','files'
      ]
    }
  },
  
   scoring: {
    // Relevance scoring weights (0.0 to 2.0 range)
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
      fieldLengthPenalty: 0.1      
    },
    maxBaseScore: 100,             
  },
  
  // UI and display settings
  ui: {
    searchHistorySize: 15,
    enableSuggestions: true,
    maxSuggestions: 8,
    showRelevanceScores: process.env.NODE_ENV === 'development',
    enableKeyboardShortcuts: true,
  },
  
  // Performance settings
  performance: {  
    resultCacheSize: 100,
    resultCacheTTL: 10 * 60 * 1000
  },
  
  // Integration settings
  integration: {
    enableExternalTools: true,
  },
};