import ChecklistUtil from "../../app/utils/checklist";
import Constants from "../../app/constants/constants";

describe('utils', () => {
  describe('ChecklistUtil', () => {
    describe('findAssetLanguagesAndDependencies', () => {
      it('should return empty result when asset is null or undefined', () => {
        expect(ChecklistUtil.findAssetLanguagesAndDependencies(null)).toEqual({
          languages: [],
          dependencies: [],
        });
        expect(ChecklistUtil.findAssetLanguagesAndDependencies(undefined)).toEqual({
          languages: [],
          dependencies: [],
        });
      });

      it('should return correct languages and dependencies for valid code assets', () => {
        const languages = {'R': ['r', 'rmd', 'rnw', 'snw'], 'Python': ['py', 'py3', 'pyi'], 'SAS': ['sas'], 'Stata': ['do', 'ado', 'mata'], 'HTML': ['htm', 'html']};
        Object.keys(languages).forEach((lang) => {
          languages[lang].forEach((ext) => {
            expect(ChecklistUtil.findAssetLanguagesAndDependencies({
              type: Constants.AssetType.FILE,
              contentTypes: [Constants.AssetContentType.CODE],
              uri: `path/to/file.${ext}`,
            })).toEqual({
              languages: [lang],
              dependencies: [],
            });
          });
        });
      });

      it('should return empty result for non-code assets (data, documentation)', () => {
        expect(ChecklistUtil.findAssetLanguagesAndDependencies({
          type: Constants.AssetType.FILE,
          contentTypes: [Constants.AssetContentType.DATA],
          uri: 'path/to/file.csv',
        })).toEqual({
          languages: [],
          dependencies: [],
        });
      });

      it('should return empty result for unmatching content type and asset type', () => {
        expect(ChecklistUtil.findAssetLanguagesAndDependencies({
          type: Constants.AssetType.FILE,
          contentTypes: [Constants.AssetContentType.DATA],
          uri: 'path/to/file.py',
        })).toEqual({
          languages: [],
          dependencies: [],
        });

        expect(ChecklistUtil.findAssetLanguagesAndDependencies({
          type: Constants.AssetType.FILE,
          contentTypes: [Constants.AssetContentType.CODE],
          uri: 'path/to/file.csv',
        })).toEqual({
          languages: [],
          dependencies: [],
        });
      });

      it('should return empty result for directory/folder type assets', () => {
        expect(ChecklistUtil.findAssetLanguagesAndDependencies({
          type: Constants.AssetType.DIRECTORY,
          contentTypes: [Constants.AssetContentType.CODE],
          uri: 'path/to/directory/',
        })).toEqual({
          languages: [],
          dependencies: [],
        });
      });

      it('should not identify malformed URIs', () => {
        expect(ChecklistUtil.findAssetLanguagesAndDependencies({
          type: Constants.AssetType.FILE,
          contentTypes: [Constants.AssetContentType.CODE],
          uri: 'path/to/malformed-uri.',
        })).toEqual({
          languages: [],
          dependencies: [],
        });
      });

      it('should ignore random/unknown extensions that are not in the content types', () => {
        expect(ChecklistUtil.findAssetLanguagesAndDependencies({
          type: Constants.AssetType.FILE,
          contentTypes: [Constants.AssetContentType.CODE],
          uri: 'path/to/file.cmd',
        })).toEqual({
          languages: [],
          dependencies: [],
        });
      });

      it('should handle nested assets and recurse properly', () => {
        expect(ChecklistUtil.findAssetLanguagesAndDependencies({
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
            }
          ],
        })).toEqual({
          languages: ['Python', 'R'], // don't change the languages ordering in this array
          dependencies: [],
        });
      });

      it('should not crash when asset has no extension in its URI', () => {
        expect(ChecklistUtil.findAssetLanguagesAndDependencies({
          type: Constants.AssetType.FILE,
          contentTypes: [Constants.AssetContentType.CODE],
          uri: 'path/to/file',
        })).toEqual({
          languages: [],
          dependencies: [],
        });
      });
    });
  });
});
