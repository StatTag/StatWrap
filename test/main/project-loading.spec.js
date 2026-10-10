import fs from 'fs';
import path from 'path';
import vm from 'vm';
import Constants from '../../app/constants/constants';
import Messages from '../../app/constants/messages';
import AssetUtil from '../../app/utils/asset';
import ProjectUtil from '../../app/utils/project';

describe('main-process project list loading resilience', () => {
  let handlers;
  let projectListService;
  let projectService;
  let logWatcherService;
  let event;

  const validMetadata1 = {
    id: 'proj-1',
    name: 'Valid Project 1',
    assets: [],
    description: { text: 'Desc 1' },
    categories: [],
    notes: [],
    people: [],
    assetGroups: [],
    externalAssets: [],
  };

  const validMetadata2 = {
    id: 'proj-2',
    name: 'Valid Project 2',
    assets: [],
    description: { text: 'Desc 2' },
    categories: [],
    notes: [],
    people: [],
    assetGroups: [],
    externalAssets: [],
  };

  beforeEach(() => {
    handlers = new Map();
    projectListService = {
      loadProjectListFromFile: jest.fn(),
    };
    projectService = {
      loadProjectFile: jest.fn(),
    };
    logWatcherService = {
      add: jest.fn(),
    };
    event = { sender: { send: jest.fn() } };

    const source = fs.readFileSync(path.join(__dirname, '../../app/main.dev.js'), 'utf8');
    const start = source.indexOf('ipcMain.on(Messages.LOAD_PROJECT_LIST_REQUEST,');
    const end = source.indexOf('ipcMain.on(Messages.LOAD_CONFIGURATION_REQUEST,', start);
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);

    vm.runInNewContext(source.substring(start, end), {
      ipcMain: { on: (message, handler) => handlers.set(message, handler) },
      app: { getPath: () => '/mock/userData' },
      DefaultProjectListFile: 'projectList.json',
      projectListService,
      projectService,
      logWatcherService,
      Constants,
      Messages,
      AssetUtil,
      ProjectUtil,
      path,
      fs: { existsSync: () => false },
      console: { log: jest.fn(), error: jest.fn() },
    });
  });

  const loadProjectList = async () =>
    handlers.get(Messages.LOAD_PROJECT_LIST_REQUEST)(event);

  it('loads all valid projects successfully', async () => {
    projectListService.loadProjectListFromFile.mockReturnValue([
      { id: 'proj-1', name: 'Project 1', path: '/path/to/proj1' },
      { id: 'proj-2', name: 'Project 2', path: '/path/to/proj2' },
    ]);
    projectService.loadProjectFile.mockImplementation((projPath) => {
      if (projPath === '/path/to/proj1') {return validMetadata1;}
      if (projPath === '/path/to/proj2') {return validMetadata2;}
      return null;
    });

    await loadProjectList();

    expect(event.sender.send).toHaveBeenCalledTimes(1);
    const [channel, response] = event.sender.send.mock.calls[0];
    expect(channel).toBe(Messages.LOAD_PROJECT_LIST_RESPONSE);
    expect(response.error).toBe(false);
    expect(response.projects).toHaveLength(2);
    expect(response.projects[0].loadError).toBe(false);
    expect(response.projects[1].loadError).toBe(false);
    expect(logWatcherService.add).toHaveBeenCalledTimes(2);
  });

  it('does not crash when one project configuration is corrupt (throws SyntaxError)', async () => {
    projectListService.loadProjectListFromFile.mockReturnValue([
      { id: 'proj-1', name: 'Project 1', path: '/path/to/proj1' },
      { id: 'proj-corrupt', name: 'Corrupt Project', path: '/path/to/corrupt' },
      { id: 'proj-2', name: 'Project 2', path: '/path/to/proj2' },
    ]);
    projectService.loadProjectFile.mockImplementation((projPath) => {
      if (projPath === '/path/to/proj1') {return validMetadata1;}
      if (projPath === '/path/to/corrupt') {
        throw new SyntaxError('Unexpected token in JSON at position 0');
      }
      if (projPath === '/path/to/proj2') {return validMetadata2;}
      return null;
    });

    await loadProjectList();

    expect(event.sender.send).toHaveBeenCalledTimes(1);
    const [channel, response] = event.sender.send.mock.calls[0];
    expect(channel).toBe(Messages.LOAD_PROJECT_LIST_RESPONSE);
    expect(response.error).toBe(false);
    expect(response.projects).toHaveLength(3);

    // First and third projects loaded fine
    expect(response.projects[0].loadError).toBe(false);
    expect(response.projects[2].loadError).toBe(false);

    // Corrupt project is flagged with loadError, not taking down the rest of the app
    expect(response.projects[1].loadError).toBe(true);
    expect(response.projects[1].errorMessage).toBe('Failed to load the project details');
  });

  it('handles offline or missing project metadata gracefully without failing other projects', async () => {
    projectListService.loadProjectListFromFile.mockReturnValue([
      { id: 'proj-1', name: 'Project 1', path: '/path/to/proj1' },
      { id: 'proj-offline', name: 'Offline Network Project', path: '/Volumes/offline/proj' },
    ]);
    projectService.loadProjectFile.mockImplementation((projPath) => {
      if (projPath === '/path/to/proj1') {return validMetadata1;}
      return null; // Missing or offline directory returns null
    });

    await loadProjectList();

    expect(event.sender.send).toHaveBeenCalledTimes(1);
    const [channel, response] = event.sender.send.mock.calls[0];
    expect(channel).toBe(Messages.LOAD_PROJECT_LIST_RESPONSE);
    expect(response.error).toBe(false);
    expect(response.projects).toHaveLength(2);
    expect(response.projects[0].loadError).toBe(false);
    expect(response.projects[1].loadError).toBe(true);
    expect(response.projects[1].errorMessage).toBe('Failed to load the project details');
  });

  it('handles projects with missing or invalid path property gracefully', async () => {
    projectListService.loadProjectListFromFile.mockReturnValue([
      { id: 'proj-invalid-path', name: 'Invalid Path Project' },
      { id: 'proj-1', name: 'Project 1', path: '/path/to/proj1' },
    ]);
    projectService.loadProjectFile.mockImplementation((projPath) => {
      if (projPath === '/path/to/proj1') {return validMetadata1;}
      return null;
    });

    await loadProjectList();

    const [, response] = event.sender.send.mock.calls[0];
    expect(response.error).toBe(false);
    expect(response.projects).toHaveLength(2);
    expect(response.projects[0].loadError).toBe(true);
    expect(response.projects[1].loadError).toBe(false);
  });

  it('reports error only when projectList.json itself is corrupt', async () => {
    projectListService.loadProjectListFromFile.mockImplementation(() => {
      throw new Error('Malformed projectList.json');
    });

    await loadProjectList();

    const [, response] = event.sender.send.mock.calls[0];
    expect(response.error).toBe(true);
    expect(response.errorMessage).toContain('The projects file is corrupt or invalid');
    expect(response.projects).toBeNull();
  });
});
