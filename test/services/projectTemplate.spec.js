import fs from 'fs';
import os from 'os';
import ProjectTemplateService from '../../app/services/projectTemplate';

jest.mock('fs');
jest.mock('os');

const TEST_USER_HOME_PATH = '/User/test/';
os.homedir.mockReturnValue(TEST_USER_HOME_PATH);

describe('services', () => {
  describe('projectTemplate', () => {

    const mockReaddirForTemplates = (layout) => {
      fs.readdirSync.mockImplementation((dirPath) => layout[dirPath] || []);
    };

    beforeEach(() => {
      if (fs.existsSync) {
        fs.existsSync.mockImplementation((path) => {
          if (typeof path === 'string' && path.includes('custom-templates')) {
            return false; 
          }
          return true;
        });
      }
    });

    afterEach(() => {
      jest.restoreAllMocks();
      jest.clearAllMocks();
    });

    describe('loadProjectTemplates', () => {
      it('should return the list of project templates', () => {
        mockReaddirForTemplates({
          '/path/templates': ['STATWRAP-EMPTY', 'STATWRAP-BASIC', 'STATWRAP-NUBCC'],
          '/path/templates/STATWRAP-EMPTY': ['1'],
          '/path/templates/STATWRAP-BASIC': ['1'],
          '/path/templates/STATWRAP-NUBCC': ['1'],
          '/path/templates/STATWRAP-EMPTY/1': [],
          '/path/templates/STATWRAP-BASIC/1': [],
          '/path/templates/STATWRAP-NUBCC/1': [],
        });
        fs.statSync.mockReturnValue(new fs.Stats());
        const projectTemplates = new ProjectTemplateService().loadProjectTemplates(
          '/path/templates',
        );
        expect(projectTemplates.length).toBe(3);
      });

      it('should filter out templates that are not found on disk', () => {
        mockReaddirForTemplates({
          '/path/templates': ['STATWRAP-BASIC', 'STATWRAP-NUBCC', 'test'],
          '/path/templates/STATWRAP-BASIC': ['1'],
          '/path/templates/STATWRAP-NUBCC': ['1'],
          '/path/templates/test': ['1'],
          '/path/templates/STATWRAP-BASIC/1': [],
          '/path/templates/STATWRAP-NUBCC/1': [],
          '/path/templates/test/1': [],
        });
        fs.statSync.mockReturnValue(new fs.Stats());
        const projectTemplates = new ProjectTemplateService().loadProjectTemplates(
          '/path/templates',
        );
        expect(projectTemplates.length).toBe(2);
      });

      it('should filter out templates where the current version is not found on disk', () => {
        mockReaddirForTemplates({
          '/path/templates': ['STATWRAP-EMPTY', 'STATWRAP-BASIC', 'STATWRAP-NUBCC'],
          '/path/templates/STATWRAP-EMPTY': ['0'],
          '/path/templates/STATWRAP-BASIC': ['1'],
          '/path/templates/STATWRAP-NUBCC': ['v1'],
          '/path/templates/STATWRAP-EMPTY/0': [],
          '/path/templates/STATWRAP-BASIC/1': [],
          '/path/templates/STATWRAP-NUBCC/v1': [],
        });
        fs.statSync.mockReturnValue(new fs.Stats());
        const projectTemplates = new ProjectTemplateService().loadProjectTemplates(
          '/path/templates',
        );
        expect(projectTemplates.length).toBe(1);
      });

      it('should filter out files that are to be excluded', () => {
        mockReaddirForTemplates({
          '/path/templates': ['STATWRAP-EMPTY'],
          '/path/templates/STATWRAP-EMPTY': ['1'],
          '/path/templates/STATWRAP-EMPTY/1': ['.DS_Store', 'file1', 'dir1'],
        });

        fs.statSync.mockReturnValue(new fs.Stats());
        const projectTemplates = new ProjectTemplateService().loadProjectTemplates(
          '/path/templates',
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
        expect(() => new ProjectTemplateService().createTemplateContents(undefined, {})).toThrow(
          Error,
        );
      });

      it('should throw an exception when the target directory does not exist', () => {
        fs.accessSync.mockReturnValue(false);
        expect(() =>
          new ProjectTemplateService().createTemplateContents('Invalid/Dir', 'STATWRAP-EMPTY'),
        ).toThrow(Error);
      });

      it('should throw an exception when a template is not specified', () => {
        fs.accessSync.mockReturnValue(true);
        expect(() =>
          new ProjectTemplateService().createTemplateContents('/Project/Dir', null),
        ).toThrow(Error);
        expect(() =>
          new ProjectTemplateService().createTemplateContents('/Project/Dir', undefined),
        ).toThrow(Error);
      });

      it('should throw an exception when a template version is not specified', () => {
        fs.accessSync.mockReturnValue(true);
        expect(() =>
          new ProjectTemplateService().createTemplateContents('/Project/Dir', 'Test', null),
        ).toThrow(Error);
        expect(() =>
          new ProjectTemplateService().createTemplateContents('/Project/Dir', 'Test', undefined),
        ).toThrow(Error);
      });

      it('should throw an exception when the template ID does not exist', () => {
        fs.accessSync.mockReturnValue(true);
        expect(() =>
          new ProjectTemplateService().createTemplateContents(
            '/Project/Dir',
            'INVALID-PROJECT-ID',
            '1',
          ),
        ).toThrow(Error);
      });

      it('should throw an exception when the template version does not exist', () => {
        fs.accessSync.mockReturnValue(true);
        expect(() =>
          new ProjectTemplateService().createTemplateContents(
            '/Project/Dir',
            'STATWRAP-EMPTY',
            '110000000',
          ),
        ).toThrow(Error);
      });

      it('should create the template for a valid template and base directory', () => {
        mockReaddirForTemplates({
          '/path/templates': ['STATWRAP-BASIC'],
          '/path/templates/STATWRAP-BASIC': ['1'],
          '/path/templates/STATWRAP-BASIC/1': ['README', 'code', 'data'],
          '/path/templates/STATWRAP-BASIC/1/code': [], 
          '/path/templates/STATWRAP-BASIC/1/data': ['raw', 'processed'],
          '/path/templates/STATWRAP-BASIC/1/data/raw': [],
          '/path/templates/STATWRAP-BASIC/1/data/processed': [],
        });
        fs.realpathSync.mockImplementation((p) => p);
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
        service.createTemplateContents('/Project/Dir', 'STATWRAP-BASIC', '1');
        expect(fs.copyFileSync).toHaveBeenCalledTimes(1);
        expect(fs.mkdirSync).toHaveBeenCalledTimes(4);
      });
    });

    describe('buildTemplateFromFolder', () => {
      it('should throw an error when no folder path is specified', () => {
        expect(() => new ProjectTemplateService().buildTemplateFromFolder(null)).toThrow(
          'You must specify a folder to import',
        );
        expect(() => new ProjectTemplateService().buildTemplateFromFolder(undefined)).toThrow(
          'You must specify a folder to import',
        );
        expect(() => new ProjectTemplateService().buildTemplateFromFolder('')).toThrow(
          'You must specify a folder to import',
        );
      });
      it('should throw an error when the folder does not exist on disk', () => {
        fs.accessSync.mockImplementation(() => {
          throw new Error('ENOENT');
        });
        expect(() =>
          new ProjectTemplateService().buildTemplateFromFolder('/nonexistent/folder'),
        ).toThrow(/does not exist/);
      });
      it('should return a template with id STATWRAP-CUSTOM and the folder basename as the name', () => {
        fs.accessSync.mockReturnValue(true);
        fs.readdirSync.mockReturnValue([]);
        fs.lstatSync.mockReturnValue({
          isDirectory: () => true,
          isSymbolicLink: () => false,
          size: 0,
        });
        const result = new ProjectTemplateService().buildTemplateFromFolder(
          '/Users/researcher/my-lab-template',
        );
        expect(result.template.id).toBe('STATWRAP-CUSTOM');
        expect(result.template.version).toBe('1');
        expect(result.template.name).toBe('my-lab-template');
        expect(result.template.contents).toEqual([]);
        expect(result.blockedExtensions).toEqual([]);
      });
      it('should scan files and folders recursively and build a contents tree', () => {
        fs.accessSync.mockReturnValue(true);
        fs.readdirSync
          .mockReturnValueOnce(['code', 'README.md'])
          .mockReturnValueOnce(['analysis.R']);
        const dirStat = {
          isDirectory: jest.fn(() => true),
          isSymbolicLink: jest.fn(() => false),
          size: 100,
        };
        const fileStat = {
          isDirectory: jest.fn(() => false),
          isSymbolicLink: jest.fn(() => false),
          size: 100,
        };
        fs.lstatSync
          .mockReturnValueOnce(dirStat)
          .mockReturnValueOnce(fileStat)
          .mockReturnValueOnce(fileStat);
        const result = new ProjectTemplateService().buildTemplateFromFolder('/project');
        expect(result.template.contents.length).toBe(2);
        expect(result.template.contents[0].type).toBe('folder');
        expect(result.template.contents[0].name).toBe('code');
        expect(result.template.contents[0].contents.length).toBe(1);
        expect(result.template.contents[0].contents[0].name).toBe('analysis.R');
        expect(result.template.contents[1].type).toBe('file');
        expect(result.template.contents[1].name).toBe('README.md');
      });
      it('should skip files in the ignore list (.DS_Store)', () => {
        fs.accessSync.mockReturnValue(true);
        fs.readdirSync.mockReturnValue(['.DS_Store', '.git', 'README.md']);
        const fileStat = {
          isDirectory: jest.fn(() => false),
          isSymbolicLink: jest.fn(() => false),
          size: 100,
        };
        fs.lstatSync.mockReturnValue(fileStat);
        const result = new ProjectTemplateService().buildTemplateFromFolder('/project');
        const fileNames = result.template.contents.map((c) => c.name);
        expect(fileNames).toContain('README.md');
        expect(fileNames).not.toContain('.DS_Store');
      });
      it('should detect blocked extensions (.exe, .dll, .sh) and exclude those files', () => {
        fs.accessSync.mockReturnValue(true);
        fs.readdirSync.mockReturnValue(['script.sh', 'malware.exe', 'README.md']);
        const fileStat = {
          isDirectory: jest.fn(() => false),
          isSymbolicLink: jest.fn(() => false),
          size: 100,
        };
        fs.lstatSync.mockReturnValue(fileStat);
        const result = new ProjectTemplateService().buildTemplateFromFolder('/project');
        expect(result.blockedExtensions).toEqual(['.exe', '.sh']);
        expect(result.template.contents.length).toBe(1);
        expect(result.template.contents[0].name).toBe('README.md');
      });
      it('should skip data file extensions (.csv, .png) silently', () => {
        fs.accessSync.mockReturnValue(true);
        fs.readdirSync.mockReturnValue(['data.csv', 'image.png', 'README.md']);
        const fileStat = {
          isDirectory: jest.fn(() => false),
          isSymbolicLink: jest.fn(() => false),
          size: 100,
        };
        fs.lstatSync.mockReturnValue(fileStat);
        const result = new ProjectTemplateService().buildTemplateFromFolder('/project');
        expect(result.template.contents.length).toBe(1);
        expect(result.template.contents[0].name).toBe('README.md');
        expect(result.blockedExtensions).toEqual([]);
      });
      it('should ignore symbolic links entirely', () => {
        fs.accessSync.mockReturnValue(true);
        fs.readdirSync.mockReturnValue(['link-to-folder', 'README.md']);
        const symlinkStat = {
          isDirectory: jest.fn(() => false),
          isSymbolicLink: jest.fn(() => true),
          size: 0,
        };
        const fileStat = {
          isDirectory: jest.fn(() => false),
          isSymbolicLink: jest.fn(() => false),
          size: 100,
        };
        fs.lstatSync.mockReturnValueOnce(symlinkStat).mockReturnValueOnce(fileStat);
        const result = new ProjectTemplateService().buildTemplateFromFolder('/project');
        expect(result.template.contents.length).toBe(1);
        expect(result.template.contents[0].name).toBe('README.md');
      });
      it('should throw when total folder size exceeds the 5 MB limit', () => {
        fs.accessSync.mockReturnValue(true);
        fs.readdirSync.mockReturnValue(['bigfile.txt']);
        const bigFileStat = {
          isDirectory: jest.fn(() => false),
          isSymbolicLink: jest.fn(() => false),
          size: 6 * 1024 * 1024,
        };
        fs.lstatSync.mockReturnValue(bigFileStat);
        expect(() =>
          new ProjectTemplateService().buildTemplateFromFolder('/project'),
        ).toThrow(/exceeds the limit/);
      });
      it('should strip the .zip extension from the folder name', () => {
        fs.accessSync.mockReturnValue(true);
        fs.readdirSync.mockReturnValue([]);
        const result = new ProjectTemplateService().buildTemplateFromFolder(
          '/tmp/my-template.zip',
        );
        expect(result.template.name).toBe('my-template');
      });
    });

    describe('createTemplateContentsFromContents', () => {
      it('should throw when baseDirectory is null or undefined', () => {
        expect(() =>
          new ProjectTemplateService().createTemplateContentsFromContents(null, []),
        ).toThrow('You must specify a base directory');
        expect(() =>
          new ProjectTemplateService().createTemplateContentsFromContents(undefined, []),
        ).toThrow('You must specify a base directory');
      });
      it('should throw when baseDirectory does not exist on disk', () => {
        fs.accessSync.mockImplementation(() => {
          throw new Error('ENOENT');
        });
        expect(() =>
          new ProjectTemplateService().createTemplateContentsFromContents('/bad/path', []),
        ).toThrow(/does not exist/);
      });
      it('should throw when contents is null, undefined, or not an array', () => {
        fs.accessSync.mockReturnValue(true);
        expect(() =>
          new ProjectTemplateService().createTemplateContentsFromContents('/good/path', null),
        ).toThrow('You must provide template contents');
        expect(() =>
          new ProjectTemplateService().createTemplateContentsFromContents(
            '/good/path',
            undefined,
          ),
        ).toThrow('You must provide template contents');
        expect(() =>
          new ProjectTemplateService().createTemplateContentsFromContents(
            '/good/path',
            'not-an-array',
          ),
        ).toThrow('You must provide template contents');
      });
      it('should copy files and create directories from a valid contents tree', () => {
        fs.accessSync.mockReturnValue(true);
        fs.copyFileSync.mockReturnValue(true);
        fs.mkdirSync.mockReturnValue(true);
        fs.existsSync.mockReturnValue(true);
        fs.realpathSync.mockImplementation((p) => p);
        const contents = [
          { name: 'README.md', type: 'file', path: '/source/README.md' },
          {
            name: 'code',
            type: 'folder',
            path: '/source/code',
            contents: [{ name: 'main.R', type: 'file', path: '/source/code/main.R' }],
          },
        ];
        new ProjectTemplateService().createTemplateContentsFromContents('/project', contents);
        expect(fs.copyFileSync).toHaveBeenCalledTimes(2);
        expect(fs.mkdirSync).toHaveBeenCalledTimes(1);
      });
    });

    describe('saveCustomTemplate', () => {
      it('should create the custom-templates directory if it does not exist', () => {
        fs.existsSync.mockReturnValueOnce(false).mockReturnValue(true);
        fs.mkdirSync.mockReturnValue(true);
        fs.writeFileSync.mockReturnValue(true);
        fs.copyFileSync.mockReturnValue(true);
        const template = { id: 'TEST-TPL', name: 'Test', contents: [] };
        new ProjectTemplateService().saveCustomTemplate('/custom-templates', template);
        expect(fs.mkdirSync).toHaveBeenCalled();
      });
      it('should write a JSON file named by the template ID', () => {
        fs.existsSync.mockReturnValue(true);
        fs.mkdirSync.mockReturnValue(true);
        fs.writeFileSync.mockReturnValue(true);
        fs.copyFileSync.mockReturnValue(true);
        const template = {
          id: 'MY-TPL-123',
          name: 'My Template',
          version: '1',
          contents: [],
        };
        new ProjectTemplateService().saveCustomTemplate('/custom-templates', template);
        expect(fs.writeFileSync).toHaveBeenCalledWith(
          expect.stringContaining('MY-TPL-123.json'),
          expect.any(String),
          'utf-8',
        );
      });
      it('should mark the saved template with isCustom = true', () => {
        fs.existsSync.mockReturnValue(true);
        fs.mkdirSync.mockReturnValue(true);
        fs.writeFileSync.mockReturnValue(true);
        fs.copyFileSync.mockReturnValue(true);
        const template = { id: 'MY-TPL', name: 'T', version: '1', contents: [] };
        const result = new ProjectTemplateService().saveCustomTemplate(
          '/custom-templates',
          template,
        );
        expect(result.isCustom).toBe(true);
      });
      it('should physically copy template files into a permanent /files// directory', () => {
        fs.existsSync
          .mockReturnValueOnce(true)
          .mockReturnValueOnce(false)
          .mockReturnValue(true);
        fs.mkdirSync.mockReturnValue(true);
        fs.writeFileSync.mockReturnValue(true);
        fs.copyFileSync.mockReturnValue(true);
        const template = {
          id: 'TPL-COPY',
          name: 'Copy Test',
          version: '1',
          contents: [{ name: 'file.txt', type: 'file', path: '/original/file.txt' }],
        };
        new ProjectTemplateService().saveCustomTemplate('/custom-templates', template);
        expect(fs.copyFileSync).toHaveBeenCalled();
      });
    });

    describe('loadCustomTemplates', () => {
      it('should return an empty array if the directory does not exist', () => {
        fs.existsSync.mockReturnValue(false);
        const result = new ProjectTemplateService().loadCustomTemplates('/nonexistent');
        expect(result).toEqual([]);
      });
      it('should load all .json files and return template objects', () => {
        fs.existsSync.mockReturnValue(true);
        fs.readdirSync.mockReturnValue(['TPL-1.json', 'TPL-2.json', 'files']);
        fs.readFileSync
          .mockReturnValueOnce(JSON.stringify({ id: 'TPL-1', name: 'Template 1' }))
          .mockReturnValueOnce(JSON.stringify({ id: 'TPL-2', name: 'Template 2' }));
        const result = new ProjectTemplateService().loadCustomTemplates('/custom-templates');
        expect(result.length).toBe(2);
        expect(result[0].id).toBe('TPL-1');
        expect(result[1].id).toBe('TPL-2');
      });
      it('should mark every loaded template with isCustom = true', () => {
        fs.existsSync.mockReturnValue(true);
        fs.readdirSync.mockReturnValue(['TPL-1.json']);
        fs.readFileSync.mockReturnValue(JSON.stringify({ id: 'TPL-1', name: 'Template 1' }));
        const result = new ProjectTemplateService().loadCustomTemplates('/custom-templates');
        expect(result[0].isCustom).toBe(true);
      });
      it('should skip corrupted JSON files without crashing', () => {
        fs.existsSync.mockReturnValue(true);
        fs.readdirSync.mockReturnValue(['bad.json', 'good.json']);
        fs.readFileSync
          .mockReturnValueOnce('this is not json {{{')
          .mockReturnValueOnce(JSON.stringify({ id: 'GOOD', name: 'Good' }));
        const result = new ProjectTemplateService().loadCustomTemplates('/custom-templates');
        expect(result.length).toBe(1);
        expect(result[0].id).toBe('GOOD');
      });
      it('should ignore subdirectories and non-JSON files', () => {
        fs.existsSync.mockReturnValue(true);
        fs.readdirSync.mockReturnValue(['files', 'notes.txt', 'TPL-1.json']);
        fs.readFileSync.mockReturnValue(JSON.stringify({ id: 'TPL-1', name: 'T1' }));
        const result = new ProjectTemplateService().loadCustomTemplates('/custom-templates');
        expect(result.length).toBe(1);
      });
    });

    describe('mergeCustomTemplates', () => {
      it('should append custom templates alongside built-in templates', () => {
        const service = new ProjectTemplateService();
        service.projectTemplates = [{ id: 'STATWRAP-EMPTY', version: '1', name: 'Empty' }];
        const result = service.mergeCustomTemplates([
          { id: 'CUSTOM-1', version: '1', name: 'Custom', isCustom: true },
        ]);
        expect(result.length).toBe(2);
        expect(result[1].id).toBe('CUSTOM-1');
      });
      it('should replace stale custom templates with fresh ones on re-merge', () => {
        const service = new ProjectTemplateService();
        service.projectTemplates = [
          { id: 'STATWRAP-EMPTY', version: '1', name: 'Empty' },
          { id: 'OLD-CUSTOM', version: '1', name: 'Old Custom', isCustom: true },
        ];
        const result = service.mergeCustomTemplates([
          { id: 'NEW-CUSTOM', version: '1', name: 'New Custom', isCustom: true },
        ]);
        expect(result.length).toBe(2);
        expect(result.find((t) => t.id === 'OLD-CUSTOM')).toBeUndefined();
        expect(result.find((t) => t.id === 'NEW-CUSTOM')).toBeDefined();
      });
      it('should initialize projectTemplates if it was null', () => {
        const service = new ProjectTemplateService();
        service.projectTemplates = null;
        const result = service.mergeCustomTemplates([
          { id: 'C1', version: '1', name: 'Custom', isCustom: true },
        ]);
        expect(result.length).toBe(1);
      });
      it('should never remove built-in templates during a merge', () => {
        const service = new ProjectTemplateService();
        service.projectTemplates = [
          { id: 'STATWRAP-EMPTY', version: '1', name: 'Empty' },
          { id: 'STATWRAP-BASIC', version: '1', name: 'Basic' },
        ];
        service.mergeCustomTemplates([
          { id: 'MY-CUSTOM', version: '1', name: 'Custom', isCustom: true },
        ]);
        expect(service.projectTemplates.find((t) => t.id === 'STATWRAP-EMPTY')).toBeDefined();
        expect(service.projectTemplates.find((t) => t.id === 'STATWRAP-BASIC')).toBeDefined();
      });
    });

    describe('deleteCustomTemplate', () => {
      it('should delete the JSON file and return true when the template exists', () => {
        fs.existsSync.mockReturnValue(true);
        fs.unlinkSync.mockReturnValue(true);
        const result = new ProjectTemplateService().deleteCustomTemplate(
          '/custom-templates',
          'TPL-123',
        );
        expect(result).toBe(true);
        expect(fs.unlinkSync).toHaveBeenCalledWith(expect.stringContaining('TPL-123.json'));
      });
      it('should return false without calling unlinkSync when the file does not exist', () => {
        fs.existsSync.mockReturnValue(false);
        const result = new ProjectTemplateService().deleteCustomTemplate(
          '/custom-templates',
          'NONEXISTENT',
        );
        expect(result).toBe(false);
        expect(fs.unlinkSync).not.toHaveBeenCalled();
      });
    });

    describe('exportCustomTemplate', () => {
      it('should create a ZIP at the export path containing the template files', () => {
        const mockWriteZip = jest.fn();
        const mockAddLocalFolder = jest.fn();
        jest.mock('adm-zip', () => {
          return jest.fn().mockImplementation(() => ({
            addLocalFolder: mockAddLocalFolder,
            writeZip: mockWriteZip,
          }));
        });
        fs.existsSync.mockReturnValue(true);
        new ProjectTemplateService().exportCustomTemplate(
          '/custom-templates',
          'TPL-123',
          '/exports/TPL-123.zip',
        );
        expect(mockWriteZip).toHaveBeenCalledWith('/exports/TPL-123.zip');
        expect(mockAddLocalFolder).toHaveBeenCalledWith(
          expect.stringContaining('files'),
          '',
        );
      });
    });
  });
});
