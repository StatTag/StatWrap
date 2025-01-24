import ChecklistUtil from '../../app/utils/checklist';
import Constants from '../../app/constants/constants';

describe('utils', () => {
  describe('ChecklistUtil', () => {
    describe('findProjectLanguagesAndDependencies', () => {
      it('should return empty result when asset is null or undefined', () => {
        expect(ChecklistUtil.findProjectLanguagesAndDependencies(null)).toEqual({});
        expect(ChecklistUtil.findProjectLanguagesAndDependencies(undefined)).toEqual({});
      });

      it('should return correct languages and dependencies for valid code assets', () => {
        const languages = {
          R: ['r', 'rmd', 'rnw', 'snw'],
          Python: ['py', 'py3', 'pyi'],
          SAS: ['sas'],
          Stata: ['do', 'ado', 'mata'],
          HTML: ['htm', 'html'],
        };
        Object.keys(languages).forEach((lang) => {
          languages[lang].forEach((ext) => {
            expect(
              ChecklistUtil.findProjectLanguagesAndDependencies({
                type: Constants.AssetType.FILE,
                contentTypes: [Constants.AssetContentType.CODE],
                uri: `path/to/file.${ext}`,
              }),
            ).toEqual({
              [lang]: []
            });
          });
        });
      });

      it('should return empty result for non-code assets (data, documentation)', () => {
        expect(
          ChecklistUtil.findProjectLanguagesAndDependencies({
            type: Constants.AssetType.FILE,
            contentTypes: [Constants.AssetContentType.DATA],
            uri: 'path/to/file.csv',
          }),
        ).toEqual({});
      });

      it('should return empty result for assets in an ignored folder', () => {
        expect(
          ChecklistUtil.findProjectLanguagesAndDependencies({
            type: Constants.AssetType.FOLDER,
            contentTypes: [Constants.AssetContentType.CODE],
            uri: '.git',
            children: [
              {
                type: Constants.AssetType.FILE,
                contentTypes: [Constants.AssetContentType.CODE],
                uri: '.git/file1.py',
              }
            ],
          }),
        ).toEqual({});
      });

      it('should return empty result for unmatching content type and extension', () => {
        expect(
          ChecklistUtil.findProjectLanguagesAndDependencies({
            type: Constants.AssetType.FILE,
            contentTypes: [Constants.AssetContentType.DATA],
            uri: 'path/to/file.py',
          }),
        ).toEqual({});

        expect(
          ChecklistUtil.findProjectLanguagesAndDependencies({
            type: Constants.AssetType.FILE,
            contentTypes: [Constants.AssetContentType.CODE],
            uri: 'path/to/file.csv',
          }),
        ).toEqual({});
      });

      it('should return empty result for directory/folder type assets', () => {
        expect(
          ChecklistUtil.findProjectLanguagesAndDependencies({
            type: Constants.AssetType.DIRECTORY,
            contentTypes: [Constants.AssetContentType.CODE],
            uri: 'path/to/directory/',
          }),
        ).toEqual({});
      });

      it('should not identify malformed URIs', () => {
        expect(
          ChecklistUtil.findProjectLanguagesAndDependencies({
            type: Constants.AssetType.FILE,
            contentTypes: [Constants.AssetContentType.CODE],
            uri: 'path/to/malformed-uri.',
          }),
        ).toEqual({});
      });

      it('should ignore random/unknown extensions that are not in the content types', () => {
        expect(
          ChecklistUtil.findProjectLanguagesAndDependencies({
            type: Constants.AssetType.FILE,
            contentTypes: [Constants.AssetContentType.CODE],
            uri: 'path/to/file.cmd',
          }),
        ).toEqual({});
      });

      it('should handle nested assets and recurse properly', () => {
        expect(
          ChecklistUtil.findProjectLanguagesAndDependencies({
            type: Constants.AssetType.FOLDER,
            contentTypes: [Constants.AssetContentType.CODE],
            uri: 'path/to/folder',
            children: [
              {
                type: Constants.AssetType.FILE,
                contentTypes: [Constants.AssetContentType.CODE],
                uri: 'path/to/folder/file1.py',
              },
              {
                type: Constants.AssetType.FILE,
                contentTypes: [Constants.AssetContentType.CODE],
                uri: 'path/to/folder/file2.r',
              },
            ],
          }),
        ).toEqual({
          'Python': [], 'R': [], // don't change the languages ordering in this array
        });
      });

      it('should not crash when asset has no extension in its URI', () => {
        expect(
          ChecklistUtil.findProjectLanguagesAndDependencies({
            type: Constants.AssetType.FILE,
            contentTypes: [Constants.AssetContentType.CODE],
            uri: 'path/to/file',
          }),
        ).toEqual({});
      });
    });

    describe('findDataFiles', () => {
      it('should return empty result when asset is null or undefined', () => {
        expect(ChecklistUtil.findDataFiles(null)).toEqual({ dataFiles: [] });
        expect(ChecklistUtil.findDataFiles(undefined)).toEqual({ dataFiles: [] });
      });

      it('should return empty result when asset is not a data file', () => {
        expect(
          ChecklistUtil.findDataFiles({
            type: Constants.AssetType.FILE,
            contentTypes: [Constants.AssetContentType.CODE],
            uri: 'path/to/file.py',
          }),
        ).toEqual({ dataFiles: [] });
      });

      it('should empty result when asset is in an ignored folder', () => {
        expect(
          ChecklistUtil.findDataFiles({
            type: Constants.AssetType.FOLDER,
            contentTypes: [Constants.AssetContentType.DATA],
            uri: '.statwrap',
            children: [
              {
                type: Constants.AssetType.FILE,
                contentTypes: [Constants.AssetContentType.DATA],
                uri: '.statwrap/file1.csv',
              },
              {
                type: Constants.AssetType.FILE,
                contentTypes: [Constants.AssetContentType.DATA],
                uri: '.statwrap/file2.json',
              },
            ],
          }),
        ).toEqual({ dataFiles: [] });
      });

      it.onMac('should return data file name when asset is a data file', () => {
        expect(
          ChecklistUtil.findDataFiles({
            type: Constants.AssetType.FILE,
            contentTypes: [Constants.AssetContentType.DATA],
            uri: 'path/to/file.csv',
          }),
        ).toEqual({ dataFiles: ['file.csv'] });
      });
      it.onWindows('should return data file name when asset is a data file', () => {
        expect(
          ChecklistUtil.findDataFiles({
            type: Constants.AssetType.FILE,
            contentTypes: [Constants.AssetContentType.DATA],
            uri: 'path\\to\\file.csv',
          }),
        ).toEqual({ dataFiles: ['file.csv'] });
      });

      it.onMac('should return data file names for nested data files', () => {
        expect(
          ChecklistUtil.findDataFiles({
            type: Constants.AssetType.FOLDER,
            contentTypes: [Constants.AssetContentType.DATA],
            uri: 'path/to/folder',
            children: [
              {
                type: Constants.AssetType.FILE,
                contentTypes: [Constants.AssetContentType.DATA],
                uri: 'path/to/folder/file1.csv',
              },
              {
                type: Constants.AssetType.FILE,
                contentTypes: [Constants.AssetContentType.DATA],
                uri: 'path/to/folder/file2.csv',
              },
            ],
          }),
        ).toEqual({ dataFiles: ['file1.csv', 'file2.csv'] });
      });
      it.onWindows('should return data file names for nested data files', () => {
        expect(
          ChecklistUtil.findDataFiles({
            type: Constants.AssetType.FOLDER,
            contentTypes: [Constants.AssetContentType.DATA],
            uri: 'path\\to\\folder',
            children: [
              {
                type: Constants.AssetType.FILE,
                contentTypes: [Constants.AssetContentType.DATA],
                uri: 'path\\to\\folder\\file1.csv',
              },
              {
                type: Constants.AssetType.FILE,
                contentTypes: [Constants.AssetContentType.DATA],
                uri: 'path\\to\\folder\\file2.csv',
              },
            ],
          }),
        ).toEqual({ dataFiles: ['file1.csv', 'file2.csv'] });
      });
    });

    describe('findEntryPointFiles', () => {
      it('should return empty result when entryPoints is null or undefined', () => {
        expect(ChecklistUtil.findEntryPointFiles(null)).toEqual({ entryPoints: [] });
        expect(ChecklistUtil.findEntryPointFiles(undefined)).toEqual({ entryPoints: [] });
      });

      it.onMac('should return entry point file names for given entrypoint assets', () => {
        expect(
          ChecklistUtil.findEntryPointFiles({
            type: Constants.AssetType.FOLDER,
            uri: 'path/to/folder',
            children: [
              {
                type: Constants.AssetType.FILE,
                contentTypes: [Constants.AssetContentType.CODE],
                uri: 'path/to/folder/file1.py',
                attributes: {
                  entrypoint: true,
                },
              },
              {
                type: Constants.AssetType.FILE,
                contentTypes: [Constants.AssetContentType.CODE],
                uri: 'path/to/folder/file2.py',
                attributes: {
                  entrypoint: false,
                },
              },
            ],
          }),
        ).toEqual({ entryPoints: ['file1.py'] });
      });
      it.onWindows('should return entry point file names for given entrypoint assets', () => {
        expect(
          ChecklistUtil.findEntryPointFiles({
            type: Constants.AssetType.FOLDER,
            uri: 'path\\to\\folder',
            children: [
              {
                type: Constants.AssetType.FILE,
                contentTypes: [Constants.AssetContentType.CODE],
                uri: 'path\\to\\folder\\file1.py',
                attributes: {
                  entrypoint: true,
                },
              },
              {
                type: Constants.AssetType.FILE,
                contentTypes: [Constants.AssetContentType.CODE],
                uri: 'path\\to\\folder\\file2.py',
                attributes: {
                  entrypoint: false,
                },
              },
            ],
          }),
        ).toEqual({ entryPoints: ['file1.py'] });
      });
    });

    describe('findDocumentationFiles', () => {
      it('should return empty result when asset is null or undefined', () => {
        expect(ChecklistUtil.findDocumentationFiles(null)).toEqual({ documentationFiles: [] });
        expect(ChecklistUtil.findDocumentationFiles(undefined)).toEqual({ documentationFiles: [] });
      });

      it('should return empty result when asset is not a documentation file', () => {
        expect(
          ChecklistUtil.findDocumentationFiles({
            type: Constants.AssetType.FILE,
            contentTypes: [Constants.AssetContentType.CODE],
            uri: 'path/to/file.py',
          }),
        ).toEqual({ documentationFiles: [] });
      });

      it('should return empty result when asset is ignored', () => {
        expect(
          ChecklistUtil.findDocumentationFiles({
            type: Constants.AssetType.FOLDER,
            contentTypes: [Constants.AssetContentType.DOCUMENTATION],
            uri: '.statwrap',
            children: [
              {
                type: Constants.AssetType.FILE,
                contentTypes: [Constants.AssetContentType.DOCUMENTATION],
                uri: '.statwrap/file1.md',
              },
            ],
          }),
        ).toEqual({ documentationFiles: [] });
      });

      it.onMac('should return documentation file name when asset is a documentation file', () => {
        expect(
          ChecklistUtil.findDocumentationFiles({
            type: Constants.AssetType.FILE,
            contentTypes: [Constants.AssetContentType.DOCUMENTATION],
            uri: 'path/to/file.md',
          }),
        ).toEqual({ documentationFiles: ['file.md'] });
      });
      it.onWindows('should return documentation file name when asset is a documentation file', () => {
        expect(
          ChecklistUtil.findDocumentationFiles({
            type: Constants.AssetType.FILE,
            contentTypes: [Constants.AssetContentType.DOCUMENTATION],
            uri: 'path\\to\\file.md',
          }),
        ).toEqual({ documentationFiles: ['file.md'] });
      });

      it.onMac('should return documentation file names for nested documentation files', () => {
        expect(
          ChecklistUtil.findDocumentationFiles({
            type: Constants.AssetType.FOLDER,
            contentTypes: [Constants.AssetContentType.DOCUMENTATION],
            uri: 'path/to/folder',
            children: [
              {
                type: Constants.AssetType.FILE,
                contentTypes: [Constants.AssetContentType.DOCUMENTATION],
                uri: 'path/to/folder/file1.md',
              },
              {
                type: Constants.AssetType.FILE,
                contentTypes: [Constants.AssetContentType.DOCUMENTATION],
                uri: 'path/to/folder/file2.md',
              },
              {
                type: Constants.AssetType.FILE,
                contentTypes: [Constants.AssetContentType.CODE],
                uri: 'path/to/folder/file3.py',
              },
            ],
          }),
        ).toEqual({ documentationFiles: ['file1.md', 'file2.md'] });
      });
      it.onWindows('should return documentation file names for nested documentation files', () => {
        expect(
          ChecklistUtil.findDocumentationFiles({
            type: Constants.AssetType.FOLDER,
            contentTypes: [Constants.AssetContentType.DOCUMENTATION],
            uri: 'path\\to\\folder',
            children: [
              {
                type: Constants.AssetType.FILE,
                contentTypes: [Constants.AssetContentType.DOCUMENTATION],
                uri: 'path\\to\\folder\\file1.md',
              },
              {
                type: Constants.AssetType.FILE,
                contentTypes: [Constants.AssetContentType.DOCUMENTATION],
                uri: 'path\\to\\folder\\file2.md',
              },
              {
                type: Constants.AssetType.FILE,
                contentTypes: [Constants.AssetContentType.CODE],
                uri: 'path\\to\\folder\\file3.py',
              },
            ],
          }),
        ).toEqual({ documentationFiles: ['file1.md', 'file2.md'] });
      });
    });
  });
});
