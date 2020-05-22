import fs from 'fs';
import os from 'os';
import ProjectService from '../../app/services/project';
import Constants from '../../app/constants/constants';

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
    "favorite": false,
    "lastAccessed": "2020-04-21T21:21:27.041Z",
    "path": "smb://fsmresfiles.fsm.northwestern.edu/fsmresfiles/Projects/Shared/Project2"
  }
]`;

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

const projectString = `{
  "id": "d01d2925-f6ff-4f8e-988f-fca2ee193427",
  "name": "Test 1",
  "tags": [ "tag1", "tag2", "tag3" ]
}`;

const invalidProjectString = `{
  "id": "d01d2925-f6ff-4f8e-988f-fca2ee193427
}`;

describe('services', () => {
  describe('project', () => {
    afterEach(() => {
      jest.restoreAllMocks();
      jest.clearAllMocks();
    });

    describe('loadListFromFile', () => {
      it('should return the list of projects', () => {
        fs.existsSync.mockReturnValue(true);
        fs.readFileSync.mockReturnValue(projectListString);
        const projects = new ProjectService().loadListFromFile(
          'test-project-list.json'
        );
        expect(projects.length).toBe(2);
        expect(fs.readFileSync).toHaveBeenCalledWith('test-project-list.json');
      });
      it('should sort the list of project names', () => {
        fs.existsSync.mockReturnValue(true);
        fs.readFileSync.mockReturnValue(unsortedProjectListString);
        const projects = new ProjectService().loadListFromFile(
          'test-project-list.json'
        );
        expect(projects.length).toBe(5);
        expect(projects[0].id).toBe("3"); // "(Unnamed Project)"
        expect(projects[1].id).toBe("5"); // "a test"
        expect(projects[2].id).toBe("4"); // "A Test Project"
        expect(projects[3].id).toBe("2"); // "Project Number Two"
        expect(projects[4].id).toBe("1"); // "Test Project"
      });
      it('should throw an exception if the JSON is invalid', () => {
        fs.existsSync.mockReturnValue(true);
        fs.readFileSync.mockReturnValue(invalidProjectListString);
        expect(() =>
          new ProjectService().loadListFromFile('test-project-list.json')
        ).toThrow(SyntaxError);
      });
      it('should use the default file name when no parameter is specified', () => {
        fs.existsSync.mockReturnValue(true);
        fs.readFileSync.mockReturnValue(projectListString);
        const projects = new ProjectService().loadListFromFile();
        expect(projects.length).toBe(2);
        expect(fs.readFileSync).toHaveBeenCalledWith('.statwrap-projects.json');
      });
      it('should return an empty array if no file is found', () => {
        fs.existsSync.mockReturnValue(false);
        const projects = new ProjectService().loadListFromFile();
        expect(projects.length).toBe(0);
        expect(fs.readFileSync).not.toHaveBeenCalled();
      });
    });

    describe('loadFromFile', () => {
      it('should resolve the ~ home path', () => {
        fs.existsSync.mockReturnValue(true);
        fs.readFileSync.mockReturnValue(projectString);
        const project = new ProjectService().loadFromFile('~/Test/Path');
        expect(project).not.toBeNull();
        expect(fs.readFileSync).toHaveBeenCalledWith(
          `${TEST_USER_HOME_PATH}Test/Path/.statwrap-project.json`
        );
      });
      it('should return the project details', () => {
        fs.existsSync.mockReturnValue(true);
        fs.readFileSync.mockReturnValue(projectString);
        const project = new ProjectService().loadFromFile('/Test/Path');
        expect(project).not.toBeNull();
        expect(fs.readFileSync).toHaveBeenCalledWith(
          '/Test/Path/.statwrap-project.json'
        );
      });
      it('should throw an exception if the JSON is invalid', () => {
        fs.existsSync.mockReturnValue(true);
        fs.readFileSync.mockReturnValue(invalidProjectString);
        // eslint-disable-next-line prettier/prettier
        expect(() => new ProjectService().loadFromFile('/Test/Path')).toThrow(SyntaxError);
      });
      it('should return null if the file path does not exist', () => {
        fs.existsSync.mockReturnValue(false);
        const project = new ProjectService().loadFromFile('/Test/Path');
        expect(project).toBeNull();
        expect(fs.readFileSync).not.toHaveBeenCalled();
      });
    });

    describe('sanitizeFolderName', () => {
      it('should should handle null, undefined and empty input', () => {
        const service = new ProjectService();
        expect(service.sanitizeFolderName(null)).toBe('');
        expect(service.sanitizeFolderName(undefined)).toBe('');
        expect(service.sanitizeFolderName('')).toBe('');
      });

      it('should strip periods from the beginning of the folder name', () => {
        const service = new ProjectService();
        expect(service.sanitizeFolderName('.test')).toBe('test');
        expect(service.sanitizeFolderName(' .test')).toBe('test');
      });

      it('should strip periods from the end of the folder name', () => {
        const service = new ProjectService();
        expect(service.sanitizeFolderName('test.')).toBe('test');
        expect(service.sanitizeFolderName('test. ')).toBe('test');
      });

      it('should leave valid characters untouched', () => {
        const service = new ProjectService();
        expect(service.sanitizeFolderName('Simple example')).toBe('Simple example');
        expect(service.sanitizeFolderName('This is okay!')).toBe('This is okay!');
        expect(service.sanitizeFolderName('1+1=2')).toBe('1+1=2');
      });

      it('should trim anything over 255 characters', () => {
        const service = new ProjectService();
        const longName = 'a'.repeat(255);
        expect(service.sanitizeFolderName(longName)).toBe(longName);
        expect(service.sanitizeFolderName(`${longName}a`)).toBe(longName);
      });
    });

    describe('loadProjectTemplates', () => {
      it('should return the list of default project templates', () => {
        const projectTemplates = new ProjectService().loadProjectTemplates();
        expect(projectTemplates.length).toBe(3);
      });
    });

    describe('convertAndValidateProject', () => {
      it('should flag a null parameter as invalid', () => {
        const validationReport = new ProjectService().convertAndValidateProject(null);
        expect(validationReport.isValid).toBe(false);
        expect(validationReport.details).toBe('No project information was provided for validation');
      });

      it('should flag an undefined parameter as invalid', () => {
        const validationReport = new ProjectService().convertAndValidateProject(undefined);
        expect(validationReport.isValid).toBe(false);
        expect(validationReport.details).toBe('No project information was provided for validation');
      });

      it('should flag an unknown project type as invalid', () => {
        const validationReport = new ProjectService().convertAndValidateProject(
          {
            directory: '/Test/Path',
            name: 'My Test Project',
            type: 'Invalid'
          }
        );
        expect(validationReport.isValid).toBe(false);
        expect(validationReport.details).toBe('An unknown project type (Invalid) was specified.');
      });

      it('should create transform and create new ID and lastAccessed for a new project', () => {
        const validationReport = new ProjectService().convertAndValidateProject(
          {
            directory: '/Test/Path',
            name: 'My Test Project',
            type: Constants.ProjectType.NEW_PROJECT_TYPE
          }
        );
        expect(validationReport.isValid).toBe(true);
        expect(validationReport.details).toBe('');
        expect(validationReport.project).not.toBeNull();
        expect(validationReport.project.id).not.toBe(null);
        expect(validationReport.project.id.length).toBe(36); // v4 UUID length, with hyphens
        expect(validationReport.project.path).toBe('/Test/Path/My Test Project');
        expect(validationReport.project.lastAccessed).not.toBe(null);
        expect(validationReport.project.lastAccessed.length).not.toBe(0);
        expect(validationReport.project.favorite).toBe(false);
        expect(validationReport.project.name).toBe('My Test Project');
      });

      it('should transform a relative root directory for a new project', () => {
        const validationReport = new ProjectService().convertAndValidateProject(
          {
            directory: '~',
            name: 'My Test Project',
            type: Constants.ProjectType.NEW_PROJECT_TYPE
          }
        );
        expect(validationReport.project.path).toBe(TEST_USER_HOME_PATH + 'My Test Project');
      });

      it('should strip invalid characters from a new project name for the path', () => {
        const folderWithInvalidChars = '.My: Test** Project ??';
        const validationReport = new ProjectService().convertAndValidateProject(
          {
            directory: '/Test/Path',
            name: folderWithInvalidChars,
            type: Constants.ProjectType.NEW_PROJECT_TYPE
          }
        );
        expect(validationReport.project.name).toBe(folderWithInvalidChars);
        expect(validationReport.project.path).toBe('/Test/Path/My Test Project');
      });

      it('should create transform and create new ID and lastAccessed for an existing project', () => {
        const validationReport = new ProjectService().convertAndValidateProject(
          {
            directory: '/Test/Path/My Test Project',
            type: Constants.ProjectType.EXISTING_PROJECT_TYPE
          }
        );
        expect(validationReport.isValid).toBe(true);
        expect(validationReport.details).toBe('');
        expect(validationReport.project).not.toBeNull();
        expect(validationReport.project.id).not.toBe(null);
        expect(validationReport.project.id.length).toBe(36); // v4 UUID length, with hyphens
        expect(validationReport.project.path).toBe('/Test/Path/My Test Project');
        expect(validationReport.project.lastAccessed).not.toBe(null);
        expect(validationReport.project.lastAccessed.length).not.toBe(0);
        expect(validationReport.project.favorite).toBe(false);
        expect(validationReport.project.name).toBe('My Test Project');
      });
    });

    describe('appendAndSaveProjectToList', () => {
      it('should initialize and save the file if it does not exist', () => {
        fs.existsSync.mockReturnValue(false);
        const service = new ProjectService();
        service.appendAndSaveProjectToList({
          id: '12345',
          name: 'Test',
          path: '/Test/Project/Path'
        });
        expect(fs.writeFileSync).toHaveBeenCalled();
      });

      it('should throw an error and fail to save if the file is invalid', () => {
        fs.existsSync.mockReturnValue(true);
        fs.readFileSync.mockReturnValue(invalidProjectListString);
        expect(() =>
          new ProjectService().appendAndSaveProjectToList({
            id: '12345',
            name: 'Test',
            path: '/Test/Project/Path'
          })
        ).toThrow(SyntaxError);
        expect(fs.writeFileSync).not.toHaveBeenCalled();
      });
    });
  });
});
