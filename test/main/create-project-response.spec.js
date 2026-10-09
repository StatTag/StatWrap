import fs from 'fs';
import path from 'path';
import vm from 'vm';
import Constants from '../../app/constants/constants';
import Messages from '../../app/constants/messages';

describe('main-process project creation response', () => {
  let handler;
  let projectService;
  let projectListService;
  let event;
  const project = { id: 'generated-id', name: 'Generated name', path: '/project' };

  beforeEach(() => {
    projectService = {
      convertAndValidateProject: jest.fn(() => ({ isValid: true, project: { ...project } })),
      loadProjectFile: jest.fn(),
      createProjectConfig: jest.fn(),
      saveProjectFile: jest.fn(),
      initializeNewProject: jest.fn(),
    };
    projectListService = { appendAndSaveProjectToList: jest.fn() };
    event = { sender: { send: jest.fn() } };
    const source = fs.readFileSync(path.join(__dirname, '../../app/main.dev.js'), 'utf8');
    const start = source.indexOf('ipcMain.on(Messages.CREATE_PROJECT_REQUEST,');
    const end = source.indexOf('\n});', start) + '\n});'.length;
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    vm.runInNewContext(source.substring(start, end), {
      ipcMain: { on: (message, callback) => { handler = callback; } },
      projectService,
      projectListService,
      projectTemplateService: { createTemplateContents: jest.fn() },
      AssetService: jest.fn(() => ({ scan: jest.fn(() => ({})) })),
      FileHandler: jest.fn(),
      logWatcherService: { add: jest.fn() },
      app: { getPath: () => '/user-data' },
      DefaultProjectListFile: 'projects.json',
      Constants,
      Messages,
      path,
      fs: { existsSync: () => true, writeFileSync: jest.fn() },
      require: () => ({
        cloneDirectoryStructure: jest.fn(),
        createStatWrapConfig: jest.fn(),
      }),
      console: { log: jest.fn() },
    });
  });

  it('returns the saved ID and name when linking a configured project', async () => {
    projectService.loadProjectFile.mockReturnValue({ id: 'saved-id', name: 'Saved name' });
    await handler(event, { type: Constants.ProjectType.EXISTING_PROJECT_TYPE });
    expect(projectListService.appendAndSaveProjectToList).toHaveBeenCalledWith(
      { ...project, id: 'saved-id', name: 'Saved name' }, '/user-data/projects.json',
    );
    expect(event.sender.send).toHaveBeenCalledWith(Messages.CREATE_PROJECT_RESPONSE, {
      project: { ...project, id: 'saved-id', name: 'Saved name' },
      statWrapConfigExisted: true, error: false, errorMessage: '',
    });
  });

  it.each([
    Constants.ProjectType.NEW_PROJECT_TYPE,
    Constants.ProjectType.EXISTING_PROJECT_TYPE,
    Constants.ProjectType.CLONE_PROJECT_TYPE,
  ])('returns the ID saved in the list for %s', async (type) => {
    await handler(event, { type, template: { id: 'template', version: '1' } });
    expect(event.sender.send).toHaveBeenCalledWith(
      Messages.CREATE_PROJECT_RESPONSE,
      expect.objectContaining({ project, error: false }),
    );
    expect(projectListService.appendAndSaveProjectToList).toHaveBeenCalledWith(
      expect.objectContaining(project), '/user-data/projects.json',
    );
  });

  it('reports persistence errors instead of a successful creation', async () => {
    projectListService.appendAndSaveProjectToList.mockImplementation(() => {
      throw new Error('Write failed');
    });
    await handler(event, { type: Constants.ProjectType.EXISTING_PROJECT_TYPE });
    expect(event.sender.send).toHaveBeenCalledWith(
      Messages.CREATE_PROJECT_RESPONSE,
      expect.objectContaining({ error: true, errorMessage: expect.any(String) }),
    );
  });
});
