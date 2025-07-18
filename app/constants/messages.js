module.exports = {
  LOAD_PROJECT_LIST_REQUEST: 'statwrap-load-projects-request',
  LOAD_PROJECT_LIST_RESPONSE: 'statwrap-load-projects-response',
  LOAD_CONFIGURATION_REQUEST: 'statwrap-load-configuration-request',
  LOAD_CONFIGURATION_RESPONSE: 'statwrap-load-configuration-response',

  CREATE_PROJECT_REQUEST: 'statwrap-create-project-request',
  CREATE_PROJECT_RESPONSE: 'statwrap-create-project-response',

  UPDATE_PROJECT_REQUEST: 'statwrap-update-project-request',
  UPDATE_PROJECT_RESPONSE: 'statwrap-update-project-response',

  // This message pair is used from the primary renderer -> main
  SCAN_PROJECT_REQUEST: 'statwrap-scan-project-request',
  SCAN_PROJECT_RESPONSE: 'statwrap-scan-project-response',
  // This message pair is used from main -> worker renderer
  SCAN_PROJECT_WORKER_REQUEST: 'statwrap-scan-project-worker-request',
  SCAN_PROJECT_WORKER_RESPONSE: 'statwrap-scan-project-worker-response',
  // This message is used from main -> primary renderer
  SCAN_PROJECT_RESULTS_RESPONSE: 'statwrap-scan-project-results-request',

  SCAN_ASSET_DYNAMIC_DETAILS_REQUEST: 'statwrap-scan-asset-dynamic-details-request',
  SCAN_ASSET_DYNAMIC_DETAILS_RESPONSE: 'statwrap-scan-asset-dynamic-details-response',

  TOGGLE_PROJECT_FAVORITE_REQUEST: 'statwrap-toggle-project-favorite-request',
  TOGGLE_PROJECT_FAVORITE_RESPONSE: 'statwrap-toggle-project-favorite-response',

  REMOVE_PROJECT_LIST_ENTRY_REQUEST: 'statwrap-remove-project-list-entry-request',
  REMOVE_PROJECT_LIST_ENTRY_RESPONSE: 'statwrap-remove-project-list-entry-response',

  RENAME_PROJECT_LIST_ENTRY_REQUEST: 'statwrap-rename-project-list-entry-request',
  RENAME_PROJECT_LIST_ENTRY_RESPONSE: 'statwrap-rename-project-list-entry-response',

  LOAD_USER_INFO_REQUEST: 'statwrap-load-user-info-request',
  LOAD_USER_INFO_RESPONSE: 'statwrap-load-user-info-response',
  // The user profile is a subset of the overall user info (settings).  This message pair
  // is used to just save that fragment of the settings.
  SAVE_USER_PROFILE_REQUEST: 'statwrap-save-user-profile-request',
  SAVE_USER_PROFILE_RESPONSE: 'statwrap-save-user-profile-response',

  WRITE_PROJECT_LOG_REQUEST: 'statwrap-write-project-log-request',
  WRITE_PROJECT_LOG_RESPONSE: 'statwrap-write-project-log-response',
  LOAD_PROJECT_LOG_REQUEST: 'statwrap-load-project-log-request',
  LOAD_PROJECT_LOG_RESPONSE: 'statwrap-load-project-log-response',

  WRITE_PROJECT_CHECKLIST_REQUEST: 'statwrap-write-project-checklist-request',
  WRITE_PROJECT_CHECKLIST_RESPONSE: 'statwrap-write-project-checklist-response',
  LOAD_PROJECT_CHECKLIST_REQUEST: 'statwrap-load-project-checklist-request',
  LOAD_PROJECT_CHECKLIST_RESPONSE: 'statwrap-load-project-checklist-response',

  // LOAD_PROJECT_CHANGES_REQUEST: 'statwrap-load-project-changes-request',
  // LOAD_PROJECT_CHANGES_RESPONSE: 'statwrap-load-project-changes-response',

  CREATE_UPDATE_PERSON_REQUEST: 'statwrap-create-update-person-request',
  CREATE_UPDATE_PERSON_RESPONSE: 'statwrap-create-update-person-response',
  REMOVE_DIRECTORY_PERSON_REQUEST: 'statwrap-remove-directory-person-request',
  REMOVE_DIRECTORY_PERSON_RESPONSE: 'statwrap-remove-directory-person-response',
  REMOVE_PROJECT_PERSON_REQUEST: 'statwrap-remove-project-person-request',
  REMOVE_PROJECT_PERSON_RESPONSE: 'statwrap-remove-project-person-response',

  PROJECT_EXTERNALLY_CHANGED_RESPONSE: 'statwrap-project-externally-changed',
  ENHANCED_SEARCH_REQUEST: 'statwrap-enhanced-search-request',
  ENHANCED_SEARCH_RESPONSE: 'statwrap-enhanced-search-response',
  
  ENHANCED_SEARCH_INDEX_PROJECT_REQUEST: 'statwrap-enhanced-search-index-project-request',
  ENHANCED_SEARCH_INDEX_PROJECT_RESPONSE: 'statwrap-enhanced-search-index-project-response',
  ENHANCED_SEARCH_INDEX_ALL_REQUEST: 'statwrap-enhanced-search-index-all-request',
  ENHANCED_SEARCH_INDEX_ALL_RESPONSE: 'statwrap-enhanced-search-index-all-response',
  
  ENHANCED_SEARCH_STATUS_REQUEST: 'statwrap-enhanced-search-status-request',
  ENHANCED_SEARCH_STATUS_RESPONSE: 'statwrap-enhanced-search-status-response',
  ENHANCED_SEARCH_STATS_REQUEST: 'statwrap-enhanced-search-stats-request',
  ENHANCED_SEARCH_STATS_RESPONSE: 'statwrap-enhanced-search-stats-response',
  SEARCH_INDEX_PROJECT_REQUEST: 'search-index-project-request',
  SEARCH_INDEX_PROJECT_RESPONSE: 'search-index-project-response',
  SEARCH_INDEX_ALL_REQUEST: 'search-index-all-request',
  SEARCH_INDEX_ALL_RESPONSE: 'search-index-all-response',
  SEARCH_QUERY_REQUEST: 'search-query-request',
  SEARCH_QUERY_RESPONSE: 'search-query-response',
  SEARCH_STATUS_REQUEST: 'search-status-request',
  SEARCH_STATUS_RESPONSE: 'search-status-response'
};
