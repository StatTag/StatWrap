// Collection of constant values

module.exports = {
  ProjectType: {
    NEW_PROJECT_TYPE: 'New',
    EXISTING_PROJECT_TYPE: 'Existing',
    CLONE_PROJECT_TYPE: 'Clone'
  },

  UndefinedDefaults: {
    PROJECT: '(Unnamed Project)'
  },

  AssetType: {
    DIRECTORY: 'directory',
    FOLDER: 'directory', // 'DIRECTORY' is the preferred name, but we know we'll use this sometimes
    FILE: 'file'
  }
};
