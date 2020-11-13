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

  ActionType: {
    NOTE_ADDED: 'Note Added',
    NOTE_UPDATED: 'Note Updated',
    NOTE_DELETED: 'Note Deleted'
  }
};
