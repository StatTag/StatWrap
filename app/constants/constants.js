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
    FILE: 'file'
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
    PERSON_DELETED: 'Person Deleted'
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
    DATA: 'data'
  }
};
