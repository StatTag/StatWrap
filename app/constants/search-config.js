module.exports = {
  // File indexing settings
  indexing: {
    maxFileSize: 0.1 * 1024 * 1024,
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
        'a',
        'an',
        'the',
        'in',
        'on',
        'at',
        'by',
        'for',
        'with',
        'to',
        'from',
        'of',
        'about',
        'into',
        'through',
        'during',
        'before',
        'after',
        'above',
        'below',
        'up',
        'down',
        'out',
        'off',
        'over',
        'under',
        'again',
        'further',
        'and',
        'or',
        'but',
        'so',
        'yet',
        'nor',
        // Common verbs
        'is',
        'are',
        'was',
        'were',
        'be',
        'been',
        'being',
        'have',
        'has',
        'had',
        'do',
        'does',
        'did',
        'will',
        'would',
        'could',
        'should',
        // Pronouns
        'i',
        'you',
        'he',
        'she',
        'it',
        'we',
        'they',
        'me',
        'him',
        'her',
        'us',
        'them',
        'my',
        'your',
        'his',
        'its',
        'our',
        'their',
        // Common adjectives/adverbs
        'this',
        'that',
        'these',
        'those',
        'some',
        'any',
        'all',
        'each',
        'very',
        'more',
        'most',
        'other',
        'such',
        'no',
        'not',
        'only',
        'own',
        'same',
        'few',
        'much',
        'many',
        // Wh words
        'what',
        'where',
        'when',
        'why',
        'how',
        'which',
        'who',
        'whom',
        // Common filler words
        'just',
        'also',
        'even',
        'still',
        'well',
        'back',
        'way',
        'know',
        'think',
        'see',
        'get',
        'go',
        'come',
        'take',
        'make',
        'give',
        'use',
        'want',
        'need',
        'try',
        'work',
        'call',
        'ask',
      ],

      technicalStopWords: ['project', 'search', 'find', 'files'],
    },
  },

  scoring: {
    // Relevance scoring weights (0.0 to 1.0 range)
    // NOTE: These were initially chosen by rough trial-and-error to "feel right"
    // during testing. They reflect relative importance rather than strict math,
    // and can/should be adjusted in the future if ranking behavior needs tuning.
    weights: {
      exactPhraseContent: 1.0, // Highest weight for exact phrase in content
      exactPhraseTitle: 0.9, // High weight for exact phrase in title
      individualWordContent: 0.2, // Weight for individual words in content
      individualWordTitle: 0.15, // Weight for individual words in title
      allWordsBonus: 0.3, // Bonus if all query words are present
      partialWordMatch: 0.1, // Weight for partial word matches
      titlePartialMatch: 0.08, // Weight for partial matches in title (less than full word)
      contentIndexedBonus: 0.05, // Bonus if content is indexed
      flexSearchScore: 0.4, // Weight from FlexSearch score (distance-based)
      proximityBonus: 0.2, // Bonus for word proximity (closer is better)
      fieldLengthPenalty: 0.1, // Penalty for longer fields (shorter is better)
    },
    maxBaseScore: 100, // Maximum base score before applying weights
  },

  // UI and display settings
  ui: {
    searchHistorySize: 15,
    enableSuggestions: false,  // TODO - DISABLED FOR NOW. Need to correct and then re-enable.
    maxSuggestions: 8,
    showRelevanceScores: process.env.NODE_ENV === 'development',
    enableKeyboardShortcuts: true,
  },

  // Performance settings
  performance: {
    resultCacheSize: 100,
    resultCacheTTL: 10 * 60 * 1000,
  },

  // Integration settings
  integration: {
    enableExternalTools: true,
  },
};
