// Collection of constant values

module.exports = {
  ProjectType: {
    NEW_PROJECT_TYPE: 'New',
    EXISTING_PROJECT_TYPE: 'Existing',
    CLONE_PROJECT_TYPE: 'Clone',
  },

  ProjectStatus: {
    ACTIVE: 'active',
    PAST: 'past',
  },
  
  UndefinedDefaults: {
    PROJECT: '(Unnamed Project)',
    ACTION_TYPE: 'StatWrap Event',
    USER: 'StatWrap',
  },

  AssetType: {
    DIRECTORY: 'directory',
    FOLDER: 'directory', // 'DIRECTORY' is the preferred name, but we know we'll use this sometimes
    FILE: 'file',
    URL: 'url',
    GENERIC: 'generic',
    URL: 'url',

    // These are not a real asset types, but are used in our various controls
    ASSET_GROUP: 'asset-group',
    FILTER: 'filter',
    DEPENDENCY: 'dependency',
  },

  AssetContentType: {
    CODE: 'code',
    DATA: 'data',
    DOCUMENTATION: 'documentation',
    IMAGE: 'image',
    OTHER: 'other',
  },

  StatWrapFiles: {
    BASE_FOLDER: '.statwrap',
    PROJECT: '.statwrap-project.json',
    LOG: '.statwrap.log',
    CHECKLIST: '.statwrap-checklist.json',
    CLONED_PROJECT_MARKER: 'cloned_project_marker'
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

    VERSION_CONTROL_COMMIT: 'Version Control Commit',

    EXTERNAL_ASSET_ADDED: 'External Asset Added',
    EXTERNAL_ASSET_UPDATED: 'External Asset Updated',
    EXTERNAL_ASSET_DELETED: 'External Asset Deleted',

    CHECKLIST_UPDATED: 'Checklist Updated',

    ASSET_ADDED: 'Asset Added',
    ASSET_DELETED: 'Asset Deleted'
  },

  EntityType: {
    PROJECT: 'project',
    PERSON: 'person',
    ASSET: 'asset',
    EXTERNAL_ASSET: 'external asset', // Slightly different from 'asset' in that it lives outside the project folder
    CHECKLIST: 'checklist',
  },

  DescriptionContentType: {
    URI: 'URI',
    MARKDOWN: 'Markdown',
  },

  DependencyDirection: {
    IN: 'in',
    OUT: 'out',
  },

  DependencyType: {
    DEPENDENCY: 'dependency',
    FIGURE: 'figure',
    DATA: 'data',
    FILE: 'file',
  },

  FilterCategory: {
    FILE_TYPE: 'File Type',
    CONTENT_TYPE: 'Content Type',
    ASSET_TYPE: 'Asset Type',
    INPUTS_OUTPUTS: 'Inputs and Outputs',
    DEPENDENCIES: 'Dependencies/Libraries',
    ATTRIBUTE: 'Attribute',
  },

  MAX_GRAPH_LABEL_LENGTH: 31,

  CHECKLIST: [
    ['Dependency', 'Software dependencies for the project are documented.'],
    ['Data', 'Data file(s) used in the project are documented.'],
    ['Entrypoint', 'Indication of file(s) that are used to run the analysis (e.g., wrapper/entry script).'],
    ['Documentation', 'Includes project documentation.'],
    ['VersionControl', 'Version control of some kind is in place.'],
    ['AbsolutePaths', 'Avoids using absolute paths in the code.'],
  ],
};
