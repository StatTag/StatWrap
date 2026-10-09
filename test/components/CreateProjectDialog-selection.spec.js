import { ipcRenderer } from 'electron';
import CreateProjectDialog from '../../app/containers/CreateProjectDialog/CreateProjectDialog';
import Constants from '../../app/constants/constants';
import Messages from '../../app/constants/messages';

jest.mock('electron', () => ({ ipcRenderer: { send: jest.fn(), on: jest.fn() } }));
jest.mock('../../app/containers/CreateProjectDialog/CreateProject/CreateProject', () => () => null);
jest.mock('../../app/components/SelectProjectTemplate/SelectProjectTemplate', () => () => null);
jest.mock('../../app/components/ExistingDirectory/ExistingDirectory', () => () => null);
jest.mock('../../app/components/NewDirectory/NewDirectory', () => () => null);
jest.mock('../../app/components/CloneDirectory/CloneDirectory', () => () => null);
jest.mock('../../app/components/CustomTemplateBuilder/CustomTemplateBuilder', () => () => null);

describe('project creation completion', () => {
  let dialog;

  beforeEach(() => {
    jest.clearAllMocks();
    dialog = new CreateProjectDialog({ onClose: jest.fn() });
    dialog.context = 'user';
    dialog.setState = jest.fn();
  });

  it.each([
    Constants.ProjectType.NEW_PROJECT_TYPE,
    Constants.ProjectType.EXISTING_PROJECT_TYPE,
    Constants.ProjectType.CLONE_PROJECT_TYPE,
  ])('passes the successful project ID to the parent for %s', (type) => {
    dialog.state.project.type = type;
    const project = { id: 'created', path: '/created', name: 'Created project' };
    dialog.handleProjectCreated(null, { error: false, statWrapConfigExisted: false, project });
    expect(dialog.props.onClose).toHaveBeenCalledWith(true, project.id);
    expect(ipcRenderer.send).toHaveBeenCalledWith(
      Messages.WRITE_PROJECT_LOG_REQUEST, project.path,
      Constants.ActionType.PROJECT_CREATED, Constants.ActionType.PROJECT_CREATED,
      'user created project Created project', project, 'info', 'user',
    );
    expect(ipcRenderer.send).toHaveBeenCalledWith(
      Messages.WRITE_PROJECT_CHECKLIST_REQUEST, project.path, expect.any(Array),
      Constants.ActionType.CHECKLIST_CREATED, null, null,
      `${Constants.ActionType.CHECKLIST_CREATED} - New Project`,
      'Initialized the checklist for a newly created project',
      expect.any(Array), 'info', 'user',
    );
  });

  it('passes the saved ID for a linked project without reinitializing its log or checklist', () => {
    dialog.handleProjectCreated(null, {
      error: false, statWrapConfigExisted: true,
      project: { id: 'saved-id', path: '/existing', name: 'Existing' },
    });
    expect(dialog.props.onClose).toHaveBeenCalledWith(true, 'saved-id');
    expect(ipcRenderer.send).not.toHaveBeenCalled();
  });

  it('keeps the dialog open and displays the error when adding a project fails', () => {
    dialog.handleProjectCreated(null, { error: true, errorMessage: 'Creation failed' });
    expect(dialog.props.onClose).not.toHaveBeenCalled();
    expect(dialog.setState).toHaveBeenCalledWith({ errorMessage: 'Creation failed' });
  });
});
