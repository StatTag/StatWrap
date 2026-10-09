global.window = {
  require: (mod) => {
    if (mod === 'electron') {
      return { ipcRenderer: { send: jest.fn(), on: jest.fn() } };
    }
    return require(mod);
  },
};

jest.mock('electron', () => ({ ipcRenderer: { send: jest.fn(), on: jest.fn() } }));
jest.mock('@electron/remote', () => ({ dialog: {} }));
jest.mock('react-markdown', () => () => null);
jest.mock('remark-gfm', () => () => null);
jest.mock('codemirror', () => ({}));
jest.mock('easymde', () => ({}));
jest.mock('react-simplemde-editor', () => () => null);

const Project = require('../../app/components/Project/Project').default;
const Constants = require('../../app/constants/constants');
const { ActionType, EntityType, AssetType } = Constants;
const AssetUtil = require('../../app/utils/asset').default;
const { cloneDeep } = require('lodash');

describe('components', () => {
  describe('Project', () => {
    const getBaseProject = () => cloneDeep({
      id: 'proj-1',
      name: 'Test Project',
      path: '/path/to/project',
      assets: {
        uri: '/path/to/project',
        type: AssetType.DIRECTORY,
        children: [
          {
            uri: '/path/to/project/existing_file.txt',
            type: AssetType.FILE,
            notes: [{ id: 'note-1', author: 'user1', content: 'existing note' }],
          },
        ],
      },
      externalAssets: AssetUtil.createEmptyExternalAssets(),
    });

    const createProjectComponent = (props) => {
      const comp = new Project(props);
      comp.props = props;
      comp.context = 'Test User';
      return comp;
    };

    it('successfully appends a note to an existing asset without crashing', () => {
      let updatedProject = null;
      let actionType = null;
      let actionDetails = null;

      const onUpdated = (proj, type, entType, entKey, title, desc, details) => {
        updatedProject = proj;
        actionType = type;
        actionDetails = details;
      };

      const project = getBaseProject();
      const projectComponent = createProjectComponent({
        project,
        onUpdated,
        configuration: { user: 'Test User' },
      });

      const existingAsset = project.assets.children[0];
      projectComponent.assetUpsertNoteHandler(existingAsset, 'A brand new note');

      expect(actionType).toBe(ActionType.NOTE_ADDED);
      expect(actionDetails).not.toBeNull();
      expect(actionDetails.content).toBe('A brand new note');
      expect(updatedProject).not.toBeNull();
      const asset = AssetUtil.findDescendantAssetByUri(
        updatedProject.assets,
        '/path/to/project/existing_file.txt',
      );
      expect(asset.notes.length).toBe(2);
      expect(asset.notes[1].content).toBe('A brand new note');
    });

    it('successfully adds a note to an unregistered asset without crashing', () => {
      let updatedProject = null;
      let actionType = null;
      let actionDetails = null;
      let passedEntityType = null;

      const onUpdated = (proj, type, entType, entKey, title, desc, details) => {
        updatedProject = proj;
        actionType = type;
        passedEntityType = entType;
        actionDetails = details;
      };

      const project = getBaseProject();
      const projectComponent = createProjectComponent({
        project,
        onUpdated,
        configuration: { user: 'Test User' },
      });

      const unregisteredAsset = {
        uri: '/path/to/project/unregistered_file.txt',
        type: AssetType.FILE,
      };

      // This previously crashed with TypeError: assetsCopy.push is not a function
      // or pushed undefined note content
      expect(() => {
        projectComponent.assetUpsertNoteHandler(unregisteredAsset, 'Note for unregistered asset');
      }).not.toThrow();

      expect(actionType).toBe(ActionType.NOTE_ADDED);
      expect(passedEntityType).toBe(EntityType.ASSET);
      expect(actionDetails).not.toBeNull();
      expect(actionDetails.content).toBe('Note for unregistered asset');
      expect(actionDetails.author).toBe('Test User');

      expect(updatedProject).not.toBeNull();
      const foundAsset = AssetUtil.findDescendantAssetByUri(
        updatedProject.assets,
        '/path/to/project/unregistered_file.txt',
      );
      expect(foundAsset).not.toBeNull();
      expect(foundAsset.notes).not.toBeNull();
      expect(foundAsset.notes.length).toBe(1);
      expect(foundAsset.notes[0].content).toBe('Note for unregistered asset');
      // Also verifies asset.notes on unregisteredAsset was synchronized
      expect(unregisteredAsset.notes).not.toBeNull();
      expect(unregisteredAsset.notes[0].content).toBe('Note for unregistered asset');
    });

    it('successfully handles assetUpsertNoteHandler when project.assets is null/undefined', () => {
      let updatedProject = null;
      const onUpdated = (proj) => {
        updatedProject = proj;
      };

      const projectWithoutAssets = {
        id: 'proj-2',
        name: 'Empty Project',
        path: '/empty/project',
        assets: null,
      };

      const projectComponent = createProjectComponent({
        project: projectWithoutAssets,
        onUpdated,
        configuration: { user: 'Test User' },
      });

      const newAsset = {
        uri: '/empty/project/file1.txt',
        type: AssetType.FILE,
      };

      expect(() => {
        projectComponent.assetUpsertNoteHandler(newAsset, 'Note on empty project asset');
      }).not.toThrow();

      expect(updatedProject).not.toBeNull();
      expect(updatedProject.assets).not.toBeNull();
      expect(updatedProject.assets.children).not.toBeNull();
      const found = AssetUtil.findDescendantAssetByUri(
        updatedProject.assets,
        '/empty/project/file1.txt',
      );
      expect(found).not.toBeNull();
      expect(found.notes[0].content).toBe('Note on empty project asset');
    });

    it('successfully adds a note to an external asset', () => {
      let updatedProject = null;
      let passedEntityType = null;
      const onUpdated = (proj, type, entType) => {
        updatedProject = proj;
        passedEntityType = entType;
      };

      const project = getBaseProject();
      const projectComponent = createProjectComponent({
        project,
        onUpdated,
        configuration: { user: 'Test User' },
      });

      const urlAsset = {
        uri: 'https://example.com/api',
        type: AssetType.URL,
      };

      expect(() => {
        projectComponent.assetUpsertNoteHandler(urlAsset, 'Note on URL asset');
      }).not.toThrow();

      expect(passedEntityType).toBe(EntityType.EXTERNAL_ASSET);
      expect(updatedProject).not.toBeNull();
      const found = AssetUtil.findDescendantAssetByUri(
        updatedProject.externalAssets,
        'https://example.com/api',
      );
      expect(found).not.toBeNull();
      expect(found.notes[0].content).toBe('Note on URL asset');
    });

    it('deletes an asset note safely and handles missing asset gracefully', () => {
      let updatedProject = null;
      let actionType = null;
      const onUpdated = (proj, type) => {
        updatedProject = proj;
        actionType = type;
      };

      const project = getBaseProject();
      const projectComponent = createProjectComponent({
        project,
        onUpdated,
        configuration: { user: 'Test User' },
      });

      const existingAsset = project.assets.children[0];
      const noteToDelete = existingAsset.notes[0];

      expect(() => {
        projectComponent.assetDeleteNoteHandler(existingAsset, noteToDelete);
      }).not.toThrow();

      expect(actionType).toBe(ActionType.NOTE_DELETED);
      expect(updatedProject.assets.children[0].notes.length).toBe(0);

      // Gracefully handles missing asset
      expect(() => {
        projectComponent.assetDeleteNoteHandler({ uri: '/nonexistent' }, noteToDelete);
      }).not.toThrow();
    });
      it('targets checklist notes by stable ID after reorder and delete/add', () => {
        const items = [
          { id: 'new-id', order: 1, statement: 'New question', notes: [], weight: 4 },
          { id: 'retained-id', order: 2, statement: 'Retained question', notes: [], weight: 7 },
        ];
        const onChecklistUpdated = jest.fn();
        const comp = createProjectComponent({
          project: getBaseProject(),
          checklistResponse: { checklist: items },
          onChecklistUpdated,
        });
        comp.checklistUpsertNoteHandler(items[1], 'First note');
        expect(onChecklistUpdated.mock.calls[0][4]).toBe('retained-id');
        expect(items[0].notes).toEqual([]);
        const note = items[1].notes[0];
        expect(note.content).toBe('First note');
        comp.checklistUpsertNoteHandler(items[1], 'Edited note', note);
        expect(onChecklistUpdated.mock.calls[1][3]).toBe(EntityType.CHECKLIST);
        expect(onChecklistUpdated.mock.calls[1][6]).toContain('Retained question');
        expect(items[1].notes[0].content).toBe('Edited note');
        comp.checklistDeleteNoteHandler(items[1], note);
        expect(onChecklistUpdated.mock.calls[2][4]).toBe('retained-id');
        expect(items[1].notes).toEqual([]);
        expect(items[0].weight).toBe(4);
        expect(items[1].weight).toBe(7);
    });
  });
});
