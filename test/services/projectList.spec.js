import fs from 'fs';
import os from 'os';
import ProjectListService from '../../app/services/projectList';

jest.mock('fs');
jest.mock('os');

const TEST_USER_HOME_PATH = '/User/test/';
os.homedir.mockReturnValue(TEST_USER_HOME_PATH);

const projectListString = `[
  {
    "id": "d01d2925-f6ff-4f8e-988f-fca2ee193427",
    "favorite": true,
    "lastAccessed": "2020-04-21T21:21:27.041Z",
    "path": "~/Development/projects/test1"
  },
  {
    "id": "6ff79e02-4f24-4948-ac77-f3f1b67064e5",
    "lastAccessed": "2020-04-21T21:21:27.041Z",
    "path": "smb://fsmresfiles.fsm.northwestern.edu/fsmresfiles/Projects/Shared/Project2"
  }
]`;

// Used just for testing the sorting of the project list.
const unsortedProjectListString = `[
  {
    "id": "1",
    "name": "Test Project"
  },
  {
    "id": "2",
    "name": "Project Number Two"
  },
  {
    "id": "3"
  },
  {
    "id": "4",
    "name": "A Test Project"
  },
  {
    "id": "5",
    "name": "a test"
  }
]`;

const invalidProjectListString = `[
  {
    "id": "d01d2925-f6ff-4f8e-988f-fca2ee193427",
    "favorite": true,
    "lastAccessed": "2020-04-21T21:21:27.041Z",
    "path": "~/Development/projects/test1"
]`;

describe('services', () => {
  describe('projectList', () => {
    afterEach(() => {
      jest.restoreAllMocks();
      jest.clearAllMocks();
    });

    describe('loadProjectListFromFile', () => {
      it('should return the list of projects', () => {
        fs.accessSync.mockReturnValue(true);
        fs.readFileSync.mockReturnValue(projectListString);
        const projects = new ProjectListService().loadProjectListFromFile('test-project-list.json');
        expect(projects.length).toBe(2);
        expect(fs.readFileSync).toHaveBeenCalledWith('test-project-list.json');
      });
      it('should sort the list of project names', () => {
        fs.accessSync.mockReturnValue(true);
        fs.readFileSync.mockReturnValue(unsortedProjectListString);
        const projects = new ProjectListService().loadProjectListFromFile('test-project-list.json');
        expect(projects.length).toBe(5);
        expect(projects[0].id).toBe('3'); // "(Unnamed Project)"
        expect(projects[1].id).toBe('5'); // "a test"
        expect(projects[2].id).toBe('4'); // "A Test Project"
        expect(projects[3].id).toBe('2'); // "Project Number Two"
        expect(projects[4].id).toBe('1'); // "Test Project"
      });
      it('should throw an exception if the JSON is invalid', () => {
        fs.accessSync.mockReturnValue(true);
        fs.readFileSync.mockReturnValue(invalidProjectListString);
        expect(() =>
          new ProjectListService().loadProjectListFromFile('test-project-list.json')
        ).toThrow(SyntaxError);
      });
      it('should use the default file name when no parameter is specified', () => {
        fs.accessSync.mockReturnValue(true);
        fs.readFileSync.mockReturnValue(projectListString);
        const projects = new ProjectListService().loadProjectListFromFile();
        expect(projects.length).toBe(2);
        expect(fs.readFileSync).toHaveBeenCalledWith('.statwrap-projects.json');
      });
      it('should return an empty array if no file is found', () => {
        fs.accessSync.mockImplementation(() => {
          throw new Error();
        });
        const projects = new ProjectListService().loadProjectListFromFile();
        expect(projects.length).toBe(0);
        expect(fs.readFileSync).not.toHaveBeenCalled();
      });
    });

    describe('validateProjectListEntry', () => {
      it('should throw an error if the project is null or undefined', () => {
        const service = new ProjectListService();
        expect(() => service.validateProjectListEntry(null)).toThrow(Error);
        expect(() => service.validateProjectListEntry(undefined)).toThrow(Error);
      });

      it('should throw an error if the project ID is not defined', () => {
        const service = new ProjectListService();
        expect(() => service.validateProjectListEntry({ path: '/Test/Path' })).toThrow(Error);
        // eslint-disable-next-line prettier/prettier
        expect(() => service.validateProjectListEntry({ id: null, path: '/Test/Path' })).toThrow(Error);
        expect(() =>
          service.validateProjectListEntry({ id: undefined, path: '/Test/Path' })
        ).toThrow(Error);
        // eslint-disable-next-line prettier/prettier
        expect(() => service.validateProjectListEntry({ id: '', path: '/Test/Path' })).toThrow(Error);
        // eslint-disable-next-line prettier/prettier
        expect(() => service.validateProjectListEntry({ id: '   ', path: '/Test/Path' })).toThrow(Error);
      });

      it('should throw an error if the project path is not defined', () => {
        const service = new ProjectListService();
        expect(() => service.validateProjectListEntry({ id: '1' })).toThrow(Error);
        expect(() => service.validateProjectListEntry({ id: '1', path: null })).toThrow(Error);
        expect(() => service.validateProjectListEntry({ id: '1', path: undefined })).toThrow(Error);
        expect(() => service.validateProjectListEntry({ id: '1', path: '' })).toThrow(Error);
        expect(() => service.validateProjectListEntry({ id: '1', path: '   ' })).toThrow(Error);
      });

      it('should not throw an error if the ID and path are specified', () => {
        const service = new ProjectListService();
        // eslint-disable-next-line prettier/prettier
        expect(() => service.validateProjectListEntry({ id: '1', path: '/Test/Path' })).not.toThrow(Error);
      });
    });

    describe('appendAndSaveProjectToList', () => {
      it('should not try to save if the project is invalid', () => {
        fs.accessSync.mockReturnValue(false);
        const service = new ProjectListService();
        expect(() => service.appendAndSaveProjectToList(null)).toThrow(Error);
        expect(fs.writeFileSync).not.toHaveBeenCalled();
      });

      it('should not save if the project is a duplicate based on ID or path', () => {
        fs.accessSync.mockReturnValue(true);
        fs.readFileSync.mockReturnValue(projectListString);
        const service = new ProjectListService();
        // Exact same id and path
        service.appendAndSaveProjectToList({
          id: 'd01d2925-f6ff-4f8e-988f-fca2ee193427',
          path: '~/Development/projects/test1'
        });
        // Same id, different path
        service.appendAndSaveProjectToList({
          id: 'd01d2925-f6ff-4f8e-988f-fca2ee193427',
          path: '~/Development/projects/test2'
        });
        // Same path, different id
        service.appendAndSaveProjectToList({
          id: 'd01d2925-f6ff-4f8e-988f-fca2ee193428',
          path: '~/Development/projects/test1'
        });
        expect(fs.writeFileSync).not.toHaveBeenCalled();
      });

      it('should initialize and save the file if it does not exist', () => {
        fs.accessSync.mockImplementation(() => {
          throw new Error();
        });

        const service = new ProjectListService();
        service.appendAndSaveProjectToList({
          id: '12345',
          name: 'Test',
          path: '/Test/Project/Path'
        });
        expect(fs.writeFileSync).toHaveBeenCalledTimes(2);
      });

      it('should append to the existing file', () => {
        fs.accessSync.mockReturnValue(true);
        fs.readFileSync.mockReturnValue(projectListString);
        const service = new ProjectListService();
        service.appendAndSaveProjectToList({
          id: '12345',
          name: 'Test',
          path: '/Test/Project/Path'
        });
        expect(fs.writeFileSync).toHaveBeenCalled();
      });

      it('should throw an error and fail to save if the file is invalid', () => {
        fs.accessSync.mockReturnValue(true);
        fs.readFileSync.mockReturnValue(invalidProjectListString);
        expect(() =>
          new ProjectListService().appendAndSaveProjectToList({
            id: '12345',
            name: 'Test',
            path: '/Test/Project/Path'
          })
        ).toThrow(SyntaxError);
        expect(fs.writeFileSync).not.toHaveBeenCalled();
      });
    });

    describe('toggleProjectFavorite', () => {
      it('should not try to save if the project list does not exist', () => {
        fs.accessSync.mockImplementation(() => {
          throw new Error();
        });
        const service = new ProjectListService();
        expect(service.toggleProjectFavorite('d01d2925-f6ff-4f8e-988f-fca2ee193427')).toBe(false);
        expect(fs.writeFileSync).not.toHaveBeenCalled();
        expect(fs.readFileSync).not.toHaveBeenCalled();
      });

      it('should not try to save if the project ID is invalid', () => {
        fs.accessSync.mockReturnValue(true);
        fs.readFileSync.mockReturnValue(projectListString);

        const service = new ProjectListService();
        // Undefined as in 'not properly specified'
        expect(service.toggleProjectFavorite(null)).toBe(false);
        expect(service.toggleProjectFavorite(undefined)).toBe(false);

        // Also undefined as in 'can't find the ID'
        expect(service.toggleProjectFavorite('1-2-3-4')).toBe(false);

        expect(fs.writeFileSync).not.toHaveBeenCalled();
      });

      it('should update an existing project entry that has the favorite attribute', () => {
        fs.accessSync.mockReturnValue(true);
        fs.readFileSync.mockReturnValue(projectListString);
        const service = new ProjectListService();
        service.toggleProjectFavorite('d01d2925-f6ff-4f8e-988f-fca2ee193427');
        // Flip from 'true' to 'false'
        expect(fs.writeFileSync).toHaveBeenCalledWith(
          '.statwrap-projects.json',
          '[{"id":"d01d2925-f6ff-4f8e-988f-fca2ee193427","favorite":false,"lastAccessed":"2020-04-21T21:21:27.041Z","path":"~/Development/projects/test1"},{"id":"6ff79e02-4f24-4948-ac77-f3f1b67064e5","lastAccessed":"2020-04-21T21:21:27.041Z","path":"smb://fsmresfiles.fsm.northwestern.edu/fsmresfiles/Projects/Shared/Project2"}]'
        );
      });

      it('should update an existing project entry that does not have the favorite attribute', () => {
        fs.accessSync.mockReturnValue(true);
        fs.readFileSync.mockReturnValue(projectListString);
        const service = new ProjectListService();
        service.toggleProjectFavorite('6ff79e02-4f24-4948-ac77-f3f1b67064e5');
        // Initialize as 'true'
        expect(fs.writeFileSync).toHaveBeenCalledWith(
          '.statwrap-projects.json',
          '[{"id":"d01d2925-f6ff-4f8e-988f-fca2ee193427","favorite":true,"lastAccessed":"2020-04-21T21:21:27.041Z","path":"~/Development/projects/test1"},{"id":"6ff79e02-4f24-4948-ac77-f3f1b67064e5","lastAccessed":"2020-04-21T21:21:27.041Z","path":"smb://fsmresfiles.fsm.northwestern.edu/fsmresfiles/Projects/Shared/Project2","favorite":true}]'
        );
      });

      it('should throw an error and fail to save if the file is invalid', () => {
        fs.accessSync.mockReturnValue(true);
        fs.readFileSync.mockReturnValue(invalidProjectListString);
        expect(() =>
          new ProjectListService().toggleProjectFavorite('d01d2925-f6ff-4f8e-988f-fca2ee193427')
        ).toThrow(SyntaxError);
        expect(fs.writeFileSync).not.toHaveBeenCalled();
      });
    });

    describe('removeProjectEntry', () => {
      it('should not try to save if the project list does not exist', () => {
        fs.accessSync.mockImplementation(() => {
          throw new Error();
        });
        const service = new ProjectListService();
        expect(service.removeProjectEntry('d01d2925-f6ff-4f8e-988f-fca2ee193427')).toBe(false);
        expect(fs.writeFileSync).not.toHaveBeenCalled();
        expect(fs.readFileSync).not.toHaveBeenCalled();
      });

      it('should not try to save if the project ID is invalid', () => {
        fs.accessSync.mockReturnValue(true);
        fs.readFileSync.mockReturnValue(projectListString);

        const service = new ProjectListService();
        // Undefined as in 'not properly specified'
        expect(service.removeProjectEntry(null)).toBe(false);
        expect(service.removeProjectEntry(undefined)).toBe(false);

        // Also undefined as in 'can't find the ID'
        expect(service.removeProjectEntry('1-2-3-4')).toBe(false);

        expect(fs.writeFileSync).not.toHaveBeenCalled();
      });

      it('should remove an existing project entry', () => {
        fs.accessSync.mockReturnValue(true);
        fs.readFileSync.mockReturnValue(projectListString);
        const service = new ProjectListService();
        service.removeProjectEntry('d01d2925-f6ff-4f8e-988f-fca2ee193427');
        expect(fs.writeFileSync).toHaveBeenCalledWith(
          '.statwrap-projects.json',
          '[{"id":"6ff79e02-4f24-4948-ac77-f3f1b67064e5","lastAccessed":"2020-04-21T21:21:27.041Z","path":"smb://fsmresfiles.fsm.northwestern.edu/fsmresfiles/Projects/Shared/Project2"}]'
        );
      });

      it('should throw an error and fail to save if the file is invalid', () => {
        fs.accessSync.mockReturnValue(true);
        fs.readFileSync.mockReturnValue(invalidProjectListString);
        expect(() =>
          new ProjectListService().removeProjectEntry('d01d2925-f6ff-4f8e-988f-fca2ee193427')
        ).toThrow(SyntaxError);
        expect(fs.writeFileSync).not.toHaveBeenCalled();
      });
    });
  });
});
