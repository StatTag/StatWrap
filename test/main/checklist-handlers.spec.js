import fs from 'fs';
import os from 'os';
import path from 'path';
import vm from 'vm';
import Constants from '../../app/constants/constants';
import Messages from '../../app/constants/messages';

describe('main-process checklist migration logging', () => {
  let handlers;
  let checklistService;
  let logService;
  let event;
  const project = { id: 'project-1', path: '/project' };
  const migration = { fromVersion: 1, toVersion: 2 };
  const checklist = [{ id: 'item-1' }];

  beforeEach(() => {
    handlers = new Map();
    checklistService = { loadChecklist: jest.fn(), writeChecklist: jest.fn() };
    logService = { writeLog: jest.fn() };
    event = { sender: { send: jest.fn() } };
    // Execute the actual IPC registrations without starting Electron or its other services.
    const source = fs.readFileSync(path.join(__dirname, '../../app/main.dev.js'), 'utf8');
    const start = source.indexOf("ipcMain.on(\n  Messages.WRITE_PROJECT_CHECKLIST_REQUEST,");
    const end = source.indexOf('ipcMain.on(Messages.WRITE_CUSTOM_ATTRIBUTES_REQUEST', start);
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    vm.runInNewContext(source.substring(start, end), {
      ipcMain: { on: (message, handler) => handlers.set(message, handler) },
      checklistService,
      logService,
      Constants,
      Messages,
      fs: { existsSync: () => true },
      os: { homedir: () => '/home/test' },
      console: { log: jest.fn() },
    });
  });

  const load = () => handlers.get(Messages.LOAD_PROJECT_CHECKLIST_REQUEST)(event, project);
  const save = () => handlers.get(Messages.WRITE_PROJECT_CHECKLIST_REQUEST)(
    event, project.path, checklist, 'action', 'entity', 'key', 'title', 'description',
    { changed: true }, 'info', 'user',
  );

  it('logs a successfully persisted load migration in the main process', async () => {
    checklistService.loadChecklist.mockImplementation((projectPath, callback) => {
      expect(logService.writeLog).not.toHaveBeenCalled();
      callback(null, checklist, migration);
    });
    await load();
    expect(logService.writeLog).toHaveBeenCalledWith(
      project.path, Constants.ActionType.CHECKLIST_UPDATED, 'Checklist format migrated',
      'Migrated checklist from version 1 to version 2.', migration, 'info',
    );
    expect(event.sender.send).toHaveBeenCalledWith(Messages.LOAD_PROJECT_CHECKLIST_RESPONSE, {
      projectId: project.id, checklist, error: false, errorMessage: '',
    });
  });

  it('expands home-relative paths for migration log destinations', async () => {
    checklistService.loadChecklist.mockImplementation((projectPath, callback) => callback(null, checklist, migration));
    await handlers.get(Messages.LOAD_PROJECT_CHECKLIST_REQUEST)(
      event, { ...project, path: '~/project' },
    );
    expect(logService.writeLog.mock.calls[0][0]).toBe('/home/test/project');
  });

  it('does not log for unchanged loads or failed migrations', async () => {
    checklistService.loadChecklist.mockImplementation((projectPath, callback) => callback(null, checklist));
    await load();
    expect(logService.writeLog).not.toHaveBeenCalled();
    checklistService.loadChecklist.mockImplementation((projectPath, callback) => callback('Write failed', null));
    await load();
    expect(logService.writeLog).not.toHaveBeenCalled();
    expect(event.sender.send).toHaveBeenLastCalledWith(
      Messages.LOAD_PROJECT_CHECKLIST_RESPONSE,
      expect.objectContaining({ error: true, checklist: null }),
    );
  });

  it('reports migration logging failures through the load response', async () => {
    checklistService.loadChecklist.mockImplementation((projectPath, callback) => callback(null, checklist, migration));
    logService.writeLog.mockImplementation(() => { throw new Error('Log failed'); });
    await load();
    expect(event.sender.send).toHaveBeenCalledTimes(1);
    expect(event.sender.send).toHaveBeenCalledWith(
      Messages.LOAD_PROJECT_CHECKLIST_RESPONSE,
      expect.objectContaining({ error: true, errorMessage: expect.stringContaining('Log failed') }),
    );
  });

  it('logs save migrations before the ordinary action log', async () => {
    checklistService.writeChecklist.mockReturnValue(migration);
    await save();
    expect(logService.writeLog).toHaveBeenNthCalledWith(
      1, project.path, Constants.ActionType.CHECKLIST_UPDATED, 'Checklist format migrated',
      'Migrated checklist from version 1 to version 2.', migration, 'info', 'user',
    );
    expect(logService.writeLog).toHaveBeenNthCalledWith(
      2, project.path, 'action', 'title', 'description', { changed: true }, 'info', 'user',
    );
  });

  it('logs only the ordinary action for non-migrating saves', async () => {
    checklistService.writeChecklist.mockReturnValue(null);
    await save();
    expect(logService.writeLog).toHaveBeenCalledTimes(1);
    expect(logService.writeLog).toHaveBeenCalledWith(
      project.path, 'action', 'title', 'description', { changed: true }, 'info', 'user',
    );
  });

  it('does not log a failed save and reports logging failures on saves', async () => {
    checklistService.writeChecklist.mockImplementation(() => { throw new Error('Save failed'); });
    await save();
    expect(logService.writeLog).not.toHaveBeenCalled();
    checklistService.writeChecklist.mockReturnValue(migration);
    logService.writeLog.mockImplementation(() => { throw new Error('Log failed'); });
    await save();
    expect(event.sender.send).toHaveBeenLastCalledWith(
      Messages.WRITE_PROJECT_CHECKLIST_RESPONSE, expect.objectContaining({ error: true }),
    );
  });
});
