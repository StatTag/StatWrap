import { ipcRenderer } from 'electron';
import ProjectPage from '../../app/containers/ProjectPage/ProjectPage';
import Messages from '../../app/constants/messages';

jest.mock('electron', () => ({ ipcRenderer: { send: jest.fn(), on: jest.fn() } }));
jest.mock('../../app/components/Projects/Projects', () => () => null);
jest.mock('../../app/components/Project/Project', () => () => null);
jest.mock('../../app/containers/CreateProjectDialog/CreateProjectDialog', () => () => null);
jest.mock('../../app/components/Projects/ProjectListEntryMenu/ProjectListEntryMenu', () => () => null);

describe('selecting newly added projects', () => {
  let page;
  const previous = { id: 'previous', path: '/previous', favorite: true };
  const added = { id: 'added', path: '/added', name: 'Added project', assets: {} };
  let storage;

  beforeEach(() => {
    jest.clearAllMocks();
    storage = { statwrap_selected_project_id: previous.id };
    Object.defineProperty(global, 'localStorage', {
      configurable: true,
      value: {
        getItem: jest.fn((key) => storage[key] || null),
        setItem: jest.fn((key, value) => { storage[key] = value; }),
        removeItem: jest.fn((key) => { delete storage[key]; }),
      },
    });
    page = new ProjectPage({ selectedProjectId: previous.id, onSelectProject: jest.fn() });
    page.state = { ...page.state, selectedProject: previous, projects: [previous], loaded: true };
    page.setState = jest.fn((update, callback) => {
      page.state = {
        ...page.state,
        ...(typeof update === 'function' ? update(page.state) : update),
      };
      if (callback) {
        callback();
      }
    });
  });

  it('waits for the list refresh, then selects the full entry instead of the previous project', () => {
    page.handleCloseAddProject(true, added.id);
    expect(page.state.selectedProject).toBe(previous);
    expect(page.state.pendingNewProjectId).toBe(added.id);
    expect(ipcRenderer.send).toHaveBeenCalledWith(Messages.LOAD_PROJECT_LIST_REQUEST);

    page.handleLoadProjectListResponse(null, { error: false, projects: [previous, added] });

    expect(page.state.selectedProject).toBe(added);
    expect(page.state.pendingNewProjectId).toBeNull();
    expect(page.props.onSelectProject).toHaveBeenCalledWith(added.id);
    expect(storage.statwrap_selected_project_id).toBe(added.id);
    for (const message of [
      Messages.SCAN_PROJECT_REQUEST,
      Messages.LOAD_PROJECT_LOG_REQUEST,
      Messages.LOAD_PROJECT_CHECKLIST_REQUEST,
      Messages.LOAD_CUSTOM_ATTRIBUTES_REQUEST,
    ]) {
      expect(ipcRenderer.send).toHaveBeenCalledWith(message, added);
    }
  });

  it('keeps waiting if an earlier list response does not contain the added project', () => {
    page.handleCloseAddProject(true, added.id);
    page.handleLoadProjectListResponse(null, { error: false, projects: [previous] });
    expect(page.state.selectedProject).toBe(previous);
    expect(page.state.pendingNewProjectId).toBe(added.id);
    expect(ipcRenderer.send).not.toHaveBeenCalledWith(Messages.SCAN_PROJECT_REQUEST, previous);

    page.handleLoadProjectListResponse(null, { error: false, projects: [previous, added] });
    expect(page.state.selectedProject).toBe(added);
  });

  it('shows list errors without losing the pending selection, then selects on retry', () => {
    page.handleCloseAddProject(true, added.id);
    page.handleLoadProjectListResponse(null, {
      error: true, errorMessage: 'Could not load projects', projects: null,
    });
    expect(page.state.errorMessage).toBe('Could not load projects');
    expect(page.state.loaded).toBe(true);
    expect(page.state.selectedProject).toBe(previous);
    expect(page.state.pendingNewProjectId).toBe(added.id);

    page.handleLoadProjectListResponse(null, { error: false, projects: [previous, added] });
    expect(page.state.selectedProject).toBe(added);
  });

  it('does not refresh or change selection when the dialog is cancelled with an event', () => {
    page.handleCloseAddProject({ type: 'click' });
    expect(page.state.addingProject).toBe(false);
    expect(page.state.createProjectDialogKey).toBe(1);
    expect(page.state.pendingNewProjectId).toBeNull();
    expect(page.state.selectedProject).toBe(previous);
    expect(ipcRenderer.send).not.toHaveBeenCalled();
  });

  it('preserves unsaved changes until the user confirms the switch', () => {
    page.state.isProjectDirty = true;
    page.handleCloseAddProject(true, added.id);
    page.handleLoadProjectListResponse(null, { error: false, projects: [previous, added] });
    expect(page.state.selectedProject).toBe(previous);
    expect(page.state.showDirtyConfirmation).toBe(true);
    expect(page.state.pendingProject).toBe(added);
    expect(storage.statwrap_selected_project_id).toBe(previous.id);

    page.handleDiscardChanges();
    expect(page.state.selectedProject).toBe(added);
    expect(page.state.isProjectDirty).toBe(false);
    expect(storage.statwrap_selected_project_id).toBe(added.id);
  });

  it('keeps the previous project selected if the user cancels the dirty confirmation', () => {
    page.state.isProjectDirty = true;
    page.handleCloseAddProject(true, added.id);
    page.handleLoadProjectListResponse(null, { error: false, projects: [previous, added] });
    page.handleCancelSwitch();
    expect(page.state.selectedProject).toBe(previous);
    expect(page.state.pendingNewProjectId).toBeNull();
    expect(page.state.pendingProject).toBeNull();
    expect(page.state.isProjectDirty).toBe(true);
  });

  it('retains the existing saved selection behavior for ordinary refreshes', () => {
    page.handleLoadProjectListResponse(null, { error: false, projects: [previous, added] });
    expect(page.state.selectedProject).toBe(previous);
    expect(ipcRenderer.send).toHaveBeenCalledWith(Messages.SCAN_PROJECT_REQUEST, previous);
  });

  it('selects the added project when there was no previous selection', () => {
    page.state.selectedProject = null;
    page.props = {};
    storage = {};
    page.handleCloseAddProject(true, added.id);
    page.handleLoadProjectListResponse(null, { error: false, projects: [previous, added] });
    expect(page.state.selectedProject).toBe(added);
  });
});
