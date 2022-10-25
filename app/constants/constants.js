// Collection of constant values

module.exports = {
  ProjectType: {
    NEW_PROJECT_TYPE: 'New',
    EXISTING_PROJECT_TYPE: 'Existing',
    CLONE_PROJECT_TYPE: 'Clone'
  },

  UndefinedDefaults: {
    PROJECT: '(Unnamed Project)',
    ACTION_TYPE: 'StatWrap Event',
    USER: 'StatWrap'
  },

  AssetType: {
    DIRECTORY: 'directory',
    FOLDER: 'directory', // 'DIRECTORY' is the preferred name, but we know we'll use this sometimes
    FILE: 'file',
    GENERIC: 'generic',

    // These are not a real asset types, but are used in our various controls
    ASSET_GROUP: 'asset-group',
    FILTER: 'filter',
    DEPENDENCY: 'dependency'
  },

  AssetContentType: {
    CODE: 'code',
    DATA: 'data',
    DOCUMENTATION: 'documentation',
    OTHER: 'other'
  },

  StatWrapFiles: {
    BASE_FOLDER: '.statwrap',
    LOG: '.statwrap.log'
  },

  ActionType: {
    NOTE_ADDED: 'Note Added',
    NOTE_UPDATED: 'Note Updated',
    NOTE_DELETED: 'Note Deleted',

    ATTRIBUTE_UPDATED: 'Attribute Updated',

    PROJECT_CREATED: 'Project Created',

    ABOUT_DETAILS_UPDATED: 'About Details Updated',

    PERSON_ADDED: 'Person Added',
    PERSON_UPDATED: 'Person Updated',
    PERSON_DELETED: 'Person Deleted',

    ASSET_GROUP_ADDED: 'Asset Group Added',
    ASSET_GROUP_UPDATED: 'Asset Group Updated',
    ASSET_GROUP_DELETED: 'Asset Group Deleted',

    VERSION_CONTROL_COMMIT: 'Version Control Commit'
  },

  EntityType: {
    PROJECT: 'project',
    PERSON: 'person',
    ASSET: 'asset'
  },

  DescriptionContentType: {
    URI: 'URI',
    MARKDOWN: 'Markdown'
  },

  DependencyDirection: {
    IN: 'in',
    OUT: 'out'
  },

  DependencyType: {
    DEPENDENCY: 'dependency',
    FIGURE: 'figure',
    DATA: 'data',
    FILE: 'file'
  },

  FilterCategory: {
    FILE_TYPE: 'File Type',
    CONTENT_TYPE: 'Content Type',
    ASSET_TYPE: 'Asset Type',
    INPUTS_OUTPUTS: 'Inputs and Outputs',
    DEPENDENCIES: 'Dependencies/Libraries'
  }
};
