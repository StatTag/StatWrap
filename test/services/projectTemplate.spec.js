import fs from 'fs';
import os from 'os';
import ProjectTemplateService from '../../app/services/projectTemplate';

jest.mock('fs');
jest.mock('os');

const TEST_USER_HOME_PATH = '/User/test/';
os.homedir.mockReturnValue(TEST_USER_HOME_PATH);

describe('services', () => {
  describe('projectTemplate', () => {
    afterEach(() => {
      jest.restoreAllMocks();
      jest.clearAllMocks();
    });

    describe('loadProjectTemplates', () => {
      it('should return the list of project templates', () => {
        fs.readdirSync.mockReturnValue(['STATWRAP-EMPTY', 'STATWRAP-BASIC', 'STATWRAP-NUBCC']);
        fs.statSync.mockReturnValue(new fs.Stats());
        const projectTemplates = new ProjectTemplateService().loadProjectTemplates(
          '/path/templates'
        );
        expect(projectTemplates.length).toBe(3);
      });

      it('should filter out templates that are not found on disk', () => {
        fs.readdirSync.mockReturnValue(['STATWRAP-BASIC', 'STATWRAP-NUBCC', 'test']);
        fs.statSync.mockReturnValue(new fs.Stats());
        const projectTemplates = new ProjectTemplateService().loadProjectTemplates(
          '/path/templates'
        );
        expect(projectTemplates.length).toBe(2);
      });

      it('should filter out files that are to be excluded', () => {
        fs.readdirSync = jest
          .fn(() => [])
          // I know it's not really an empty project, we're just using it this way for our test
          .mockImplementationOnce(() => ['STATWRAP-EMPTY'])
          .mockImplementationOnce(() => ['.DS_Store', 'file1', 'dir1']);

        fs.statSync.mockReturnValue(new fs.Stats());
        const projectTemplates = new ProjectTemplateService().loadProjectTemplates(
          '/path/templates'
        );
        expect(projectTemplates.length).toBe(1);
        expect(projectTemplates[0].contents.length).toBe(2);
        expect(projectTemplates[0].contents[0].name).toBe('file1');
        expect(projectTemplates[0].contents[1].name).toBe('dir1');
      });
    });

    describe('createTemplateContents', () => {
      it('should throw an exception when the target directory is not specified', () => {
        fs.accessSync.mockReturnValue(false);
        expect(() => new ProjectTemplateService().createTemplateContents(null, {})).toThrow(Error);
        expect(() => new ProjectTemplateService().createTemplateContents(undefined, {})).toThrow(Error);
      });

      it('should throw an exception when the target directory does not exist', () => {
        fs.accessSync.mockReturnValue(false);
        expect(() =>
          new ProjectTemplateService().createTemplateContents('Invalid/Dir', 'STATWRAP-EMPTY')
        ).toThrow(Error);
      });

      it('should throw an exception a template is not specified', () => {
        fs.accessSync.mockReturnValue(true);
        expect(() =>
          new ProjectTemplateService().createTemplateContents('/Project/Dir', null)
        ).toThrow(Error);
        expect(() =>
          new ProjectTemplateService().createTemplateContents('/Project/Dir', undefined)
        ).toThrow(Error);
      });

      it('should throw an exception when the template ID does not exist', () => {
        fs.accessSync.mockReturnValue(true);
        expect(() =>
          new ProjectTemplateService().createTemplateContents('/Project/Dir', 'INVALID-PROJECT-ID')
        ).toThrow(Error);
      });

      it('should create the template for a valid template ID and base directory', () => {
        fs.readdirSync
          .mockReturnValueOnce(['STATWRAP-BASIC'])
          .mockReturnValueOnce(['STATWRAP-BASIC'])
          .mockReturnValueOnce(['README', 'code', 'data']) // Template dir contents
          .mockReturnValueOnce([]) // 'code' dir is empty
          .mockReturnValueOnce(['raw', 'processed']); // 'data' dir has two sub-dirs
        const stat = new fs.Stats();
        stat.isDirectory
          .mockReturnValueOnce(false)
          .mockReturnValueOnce(true)
          .mockReturnValueOnce(true)
          .mockReturnValueOnce(true)
          .mockReturnValueOnce(true);
        fs.statSync.mockReturnValue(stat);
        const service = new ProjectTemplateService();
        service.loadProjectTemplates('/path/templates');
        service.createTemplateContents('/Project/Dir', 'STATWRAP-BASIC');
        expect(fs.copyFileSync).toHaveBeenCalledTimes(1);
        expect(fs.mkdirSync).toHaveBeenCalledTimes(4);
      });
    });
  });
});
