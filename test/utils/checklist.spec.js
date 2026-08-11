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

    describe('sanitizeChecklistName', () => {
      it('should return empty string when input is null or undefined', () => {
        expect(ChecklistUtil.sanitizeChecklistName(null)).toBe('');
        expect(ChecklistUtil.sanitizeChecklistName(undefined)).toBe('');
      });

      it('should return empty string when input is not a string', () => {
        expect(ChecklistUtil.sanitizeChecklistName(123)).toBe('');
        expect(ChecklistUtil.sanitizeChecklistName(true)).toBe('');
        expect(ChecklistUtil.sanitizeChecklistName({})).toBe('');
        expect(ChecklistUtil.sanitizeChecklistName([])).toBe('');
      });

      it('should trim whitespace from both ends', () => {
        expect(ChecklistUtil.sanitizeChecklistName('  hello  ')).toBe('hello');
        expect(ChecklistUtil.sanitizeChecklistName('\n\ttabbed\n\t')).toBe('tabbed');
      });

      it('should return the name unchanged when it is within the length limit', () => {
        const shortName = 'Check data quality';
        expect(ChecklistUtil.sanitizeChecklistName(shortName)).toBe(shortName);
      });

      it('should truncate the name to the maximum allowed length', () => {
        // Create a string that is longer than the limit (250 characters)
        const longName = 'A'.repeat(Constants.CHECKLIST_NAME_MAX_LENGTH + 100);
        const result = ChecklistUtil.sanitizeChecklistName(longName);
        expect(result).toHaveLength(Constants.CHECKLIST_NAME_MAX_LENGTH);
        expect(result).toBe('A'.repeat(Constants.CHECKLIST_NAME_MAX_LENGTH));
      });

      it('should return empty string when input is only whitespace', () => {
        expect(ChecklistUtil.sanitizeChecklistName('     ')).toBe('');
        expect(ChecklistUtil.sanitizeChecklistName('\n\t  ')).toBe('');
      });

      it('should preserve HTML/script tags as plain text (no stripping)', () => {
        // Security: We don't strip HTML — React renders it as plain text.
        // The sanitizer only handles length, not content.
        const htmlInput = '<script>alert("xss")</script>';
        expect(ChecklistUtil.sanitizeChecklistName(htmlInput)).toBe(htmlInput);
      });
    });

    describe('sanitizeChecklistDescription', () => {
      it('should return empty string when input is null or undefined', () => {
        expect(ChecklistUtil.sanitizeChecklistDescription(null)).toBe('');
        expect(ChecklistUtil.sanitizeChecklistDescription(undefined)).toBe('');
      });

      it('should return empty string when input is not a string', () => {
        expect(ChecklistUtil.sanitizeChecklistDescription(42)).toBe('');
        expect(ChecklistUtil.sanitizeChecklistDescription(false)).toBe('');
      });

      it('should trim whitespace from both ends', () => {
        expect(ChecklistUtil.sanitizeChecklistDescription('  description  ')).toBe('description');
      });

      it('should return the description unchanged when it is within the length limit', () => {
        const shortDesc = 'This is a short description.';
        expect(ChecklistUtil.sanitizeChecklistDescription(shortDesc)).toBe(shortDesc);
      });

      it('should truncate the description to the maximum allowed length', () => {
        const longDesc = 'B'.repeat(Constants.CHECKLIST_DESCRIPTION_MAX_LENGTH + 500);
        const result = ChecklistUtil.sanitizeChecklistDescription(longDesc);
        expect(result).toHaveLength(Constants.CHECKLIST_DESCRIPTION_MAX_LENGTH);
        expect(result).toBe('B'.repeat(Constants.CHECKLIST_DESCRIPTION_MAX_LENGTH));
      });
    });

    describe('renumberChecklist', () => {
      it('should assign sequential order numbers starting from 1', () => {
        const input = [
          { name: 'Item A', order: 5 },
          { name: 'Item B', order: 10 },
          { name: 'Item C', order: 15 },
        ];
        const result = ChecklistUtil.renumberChecklist(input);
        expect(result[0].order).toBe(1);
        expect(result[1].order).toBe(2);
        expect(result[2].order).toBe(3);
      });

      it('should preserve all other properties of each item', () => {
        const input = [
          { name: 'Item A', order: 99, statement: 'Test statement', answer: true },
        ];
        const result = ChecklistUtil.renumberChecklist(input);
        expect(result[0].name).toBe('Item A');
        expect(result[0].statement).toBe('Test statement');
        expect(result[0].answer).toBe(true);
        expect(result[0].order).toBe(1);
      });

      it('should return an empty array when given an empty array', () => {
        expect(ChecklistUtil.renumberChecklist([])).toEqual([]);
      });

      it('should handle a single item', () => {
        const input = [{ name: 'Only Item', order: 42 }];
        const result = ChecklistUtil.renumberChecklist(input);
        expect(result).toHaveLength(1);
        expect(result[0].order).toBe(1);
        expect(result[0].name).toBe('Only Item');
      });

      it('should not mutate the original array', () => {
        const input = [
          { name: 'A', order: 5 },
          { name: 'B', order: 10 },
        ];
        const originalOrder0 = input[0].order;
        const originalOrder1 = input[1].order;
        ChecklistUtil.renumberChecklist(input);
        // Original items should not be changed
        expect(input[0].order).toBe(originalOrder0);
        expect(input[1].order).toBe(originalOrder1);
      });
    });

    describe('generateChecklistExport', () => {
      it('should return an object with the correct type and version', () => {
        const checklist = [
          { id: 1, statement: 'Test item', description: 'Desc', answer: true, notes: [], assets: [] },
        ];
        const result = ChecklistUtil.generateChecklistExport(checklist);
        expect(result.type).toBe(Constants.CHECKLIST_EXPORT_TYPE);
        expect(result.version).toBe(Constants.CHECKLIST_EXPORT_VERSION);
      });

      it('should include an exportedAt timestamp in ISO format', () => {
        const result = ChecklistUtil.generateChecklistExport([]);
        expect(result.exportedAt).toBeDefined();
        expect(new Date(result.exportedAt).toISOString()).toBe(result.exportedAt);
      });

      it('should export only name and description, not notes, assets, or scanResult', () => {
        const checklist = [
          {
            id: 1,
            statement: 'Check dependencies',
            description: 'Verify all deps',
            answer: true,
            notes: [{ id: 'n1', content: 'Secret note' }],
            assets: [{ uri: '/path/to/file.py', name: 'file.py' }],
            scanResult: { Python: ['numpy'] },
          },
        ];
        const result = ChecklistUtil.generateChecklistExport(checklist);
        const exported = result.checklists[0];

        // Should have ONLY name and description
        expect(exported.name).toBe('Check dependencies');
        expect(exported.description).toBe('Verify all deps');

        // Should NOT have any internal data
        expect(exported.notes).toBeUndefined();
        expect(exported.assets).toBeUndefined();
        expect(exported.scanResult).toBeUndefined();
        expect(exported.answer).toBeUndefined();
        expect(exported.id).toBeUndefined();
      });

      it('should handle items with no description', () => {
        const checklist = [
          { id: 1, statement: 'No description item', answer: false },
        ];
        const result = ChecklistUtil.generateChecklistExport(checklist);
        expect(result.checklists[0].description).toBe('');
      });

      it('should export all items in the checklist', () => {
        const checklist = [
          { id: 1, statement: 'Item 1', description: '' },
          { id: 2, statement: 'Item 2', description: 'Desc 2' },
          { id: 3, statement: 'Item 3', description: 'Desc 3' },
        ];
        const result = ChecklistUtil.generateChecklistExport(checklist);
        expect(result.checklists).toHaveLength(3);
      });

      it('should return an empty checklists array when given an empty checklist', () => {
        const result = ChecklistUtil.generateChecklistExport([]);
        expect(result.checklists).toEqual([]);
      });
    });

    describe('validateAndParseImport', () => {
      const makeValidExportString = (checklists) => {
        return JSON.stringify({
          type: Constants.CHECKLIST_EXPORT_TYPE,
          version: Constants.CHECKLIST_EXPORT_VERSION,
          exportedAt: new Date().toISOString(),
          checklists,
        });
      };

      const existingChecklist = [
        { id: 1, statement: 'Software dependencies for the project are documented.', name: 'Dependency' },
        { id: 2, statement: 'Data file(s) used in the project are documented.', name: 'Data' },
      ];

      describe('invalid JSON handling', () => {
        it('should reject a string that is not valid JSON', () => {
          const result = ChecklistUtil.validateAndParseImport('this is not json {{{', existingChecklist);
          expect(result.valid).toBe(false);
          expect(result.error).toContain('not valid JSON');
          expect(result.items).toEqual([]);
        });

        it('should reject a completely empty string', () => {
          const result = ChecklistUtil.validateAndParseImport('', existingChecklist);
          expect(result.valid).toBe(false);
          expect(result.items).toEqual([]);
        });

        it('should reject a string with broken JSON syntax', () => {
          const broken = '{"type": "statwrap-checklist", "checklists": [{"name": "missing quote}]}';
          const result = ChecklistUtil.validateAndParseImport(broken, existingChecklist);
          expect(result.valid).toBe(false);
          expect(result.error).toContain('not valid JSON');
        });
      });

      describe('format validation', () => {
        it('should reject JSON that is missing the type field', () => {
          const noType = JSON.stringify({ checklists: [{ name: 'Test' }] });
          const result = ChecklistUtil.validateAndParseImport(noType, existingChecklist);
          expect(result.valid).toBe(false);
          expect(result.error).toContain('type');
        });

        it('should reject JSON with a wrong type value', () => {
          const wrongType = JSON.stringify({
            type: 'package-json',
            checklists: [{ name: 'Test' }],
          });
          const result = ChecklistUtil.validateAndParseImport(wrongType, existingChecklist);
          expect(result.valid).toBe(false);
          expect(result.error).toContain('does not appear to be a StatWrap checklist');
        });

        it('should reject JSON where checklists is not an array', () => {
          const notArray = JSON.stringify({
            type: Constants.CHECKLIST_EXPORT_TYPE,
            checklists: 'not an array',
          });
          const result = ChecklistUtil.validateAndParseImport(notArray, existingChecklist);
          expect(result.valid).toBe(false);
          expect(result.error).toContain('valid "checklists" array');
        });

        it('should reject JSON where checklists array is empty', () => {
          const empty = makeValidExportString([]);
          const result = ChecklistUtil.validateAndParseImport(empty, existingChecklist);
          expect(result.valid).toBe(false);
          expect(result.error).toContain('empty checklist');
        });
      });

      describe('successful import', () => {
        it('should accept a valid export with new items', () => {
          const valid = makeValidExportString([
            { name: 'New Custom Checklist', description: 'A new item' },
          ]);
          const result = ChecklistUtil.validateAndParseImport(valid, existingChecklist);
          expect(result.valid).toBe(true);
          expect(result.error).toBeNull();
          expect(result.items).toHaveLength(1);
          expect(result.items[0].name).toBe('New Custom Checklist');
          expect(result.items[0].description).toBe('A new item');
        });

        it('should accept multiple valid items', () => {
          const valid = makeValidExportString([
            { name: 'Item A', description: 'Desc A' },
            { name: 'Item B', description: 'Desc B' },
            { name: 'Item C', description: '' },
          ]);
          const result = ChecklistUtil.validateAndParseImport(valid, existingChecklist);
          expect(result.valid).toBe(true);
          expect(result.items).toHaveLength(3);
        });

        it('should handle items with no description field', () => {
          const valid = makeValidExportString([
            { name: 'No Desc Item' },
          ]);
          const result = ChecklistUtil.validateAndParseImport(valid, existingChecklist);
          expect(result.valid).toBe(true);
          expect(result.items[0].description).toBe('');
        });
      });

      describe('sanitization', () => {
        it('should truncate names that exceed the maximum length', () => {
          const longName = 'X'.repeat(500);
          const valid = makeValidExportString([
            { name: longName, description: 'Short desc' },
          ]);
          const result = ChecklistUtil.validateAndParseImport(valid, existingChecklist);
          expect(result.valid).toBe(true);
          expect(result.items[0].name).toHaveLength(Constants.CHECKLIST_NAME_MAX_LENGTH);
        });

        it('should truncate descriptions that exceed the maximum length', () => {
          const longDesc = 'Y'.repeat(2000);
          const valid = makeValidExportString([
            { name: 'Valid Name', description: longDesc },
          ]);
          const result = ChecklistUtil.validateAndParseImport(valid, existingChecklist);
          expect(result.valid).toBe(true);
          expect(result.items[0].description).toHaveLength(Constants.CHECKLIST_DESCRIPTION_MAX_LENGTH);
        });

        it('should trim whitespace from names', () => {
          const valid = makeValidExportString([
            { name: '   Padded Name   ', description: 'desc' },
          ]);
          const result = ChecklistUtil.validateAndParseImport(valid, existingChecklist);
          expect(result.valid).toBe(true);
          expect(result.items[0].name).toBe('Padded Name');
        });
      });

      describe('duplicate handling', () => {
        it('should skip items that already exist in the current checklist (case-insensitive)', () => {
          const valid = makeValidExportString([
            { name: 'software dependencies for the project are documented.', description: '' },
            { name: 'Brand New Item', description: '' },
          ]);
          const result = ChecklistUtil.validateAndParseImport(valid, existingChecklist);
          expect(result.valid).toBe(true);
          expect(result.items).toHaveLength(1);
          expect(result.items[0].name).toBe('Brand New Item');
          expect(result.skippedCount).toBe(1);
        });

        it('should skip duplicate items within the import file itself', () => {
          const valid = makeValidExportString([
            { name: 'Duplicate Item', description: 'First occurrence' },
            { name: 'Duplicate Item', description: 'Second occurrence' },
          ]);
          const result = ChecklistUtil.validateAndParseImport(valid, existingChecklist);
          expect(result.valid).toBe(true);
          expect(result.items).toHaveLength(1);
          expect(result.items[0].description).toBe('First occurrence');
          expect(result.skippedCount).toBe(1);
        });

        it('should return valid=false when ALL items are duplicates', () => {
          const valid = makeValidExportString([
            { name: 'Software dependencies for the project are documented.' },
            { name: 'Data file(s) used in the project are documented.' },
          ]);
          const result = ChecklistUtil.validateAndParseImport(valid, existingChecklist);
          expect(result.valid).toBe(false);
          expect(result.skippedCount).toBe(2);
        });
      });

      describe('invalid item handling', () => {
        it('should skip items where name is not a string', () => {
          const valid = makeValidExportString([
            { name: 123, description: 'Not a string name' },
            { name: 'Valid Name', description: 'Valid' },
          ]);
          const result = ChecklistUtil.validateAndParseImport(valid, existingChecklist);
          expect(result.valid).toBe(true);
          expect(result.items).toHaveLength(1);
          expect(result.items[0].name).toBe('Valid Name');
          expect(result.skippedCount).toBe(1);
        });

        it('should skip items where name is empty or whitespace-only', () => {
          const valid = makeValidExportString([
            { name: '', description: 'Empty name' },
            { name: '    ', description: 'Whitespace name' },
            { name: 'Actual Item', description: 'Valid' },
          ]);
          const result = ChecklistUtil.validateAndParseImport(valid, existingChecklist);
          expect(result.valid).toBe(true);
          expect(result.items).toHaveLength(1);
          expect(result.skippedCount).toBe(2);
        });

        it('should skip null items in the checklists array', () => {
          const valid = makeValidExportString([
            null,
            { name: 'Valid After Null', description: '' },
          ]);
          const result = ChecklistUtil.validateAndParseImport(valid, existingChecklist);
          expect(result.valid).toBe(true);
          expect(result.items).toHaveLength(1);
          expect(result.skippedCount).toBe(1);
        });
      });

      describe('security - field allowlisting', () => {
        it('should only extract name and description, ignoring all extra fields', () => {
          const valid = makeValidExportString([
            {
              name: 'Safe Item',
              description: 'Safe description',
              maliciousField: 'attack payload',
              scanResult: { Python: ['hacked'] },
              notes: [{ id: 'fake', content: 'injected note' }],
              assets: [{ uri: '/etc/passwd' }],
              answer: true,
            },
          ]);
          const result = ChecklistUtil.validateAndParseImport(valid, existingChecklist);
          expect(result.valid).toBe(true);
          expect(result.items).toHaveLength(1);

          const item = result.items[0];
          expect(Object.keys(item)).toEqual(['name', 'description']);
          expect(item.name).toBe('Safe Item');
          expect(item.description).toBe('Safe description');

          expect(item.maliciousField).toBeUndefined();
          expect(item.scanResult).toBeUndefined();
          expect(item.notes).toBeUndefined();
          expect(item.assets).toBeUndefined();
          expect(item.answer).toBeUndefined();
        });

        it('should preserve HTML/script tags as plain text in name (React will escape them)', () => {
          const valid = makeValidExportString([
            { name: '<script>alert("xss")</script>', description: '<img onerror=alert(1)>' },
          ]);
          const result = ChecklistUtil.validateAndParseImport(valid, existingChecklist);
          expect(result.valid).toBe(true);
          expect(result.items[0].name).toBe('<script>alert("xss")</script>');
          expect(result.items[0].description).toBe('<img onerror=alert(1)>');
        });
      });

      describe('edge cases', () => {
        it('should work with an empty existing checklist', () => {
          const valid = makeValidExportString([
            { name: 'New Item', description: 'Desc' },
          ]);
          const result = ChecklistUtil.validateAndParseImport(valid, []);
          expect(result.valid).toBe(true);
          expect(result.items).toHaveLength(1);
        });

        it('should handle valid JSON that is not an object (e.g., a JSON array)', () => {
          const jsonArray = JSON.stringify([{ name: 'Test' }]);
          const result = ChecklistUtil.validateAndParseImport(jsonArray, existingChecklist);
          expect(result.valid).toBe(false);
        });

        it('should handle valid JSON that is a primitive (e.g., a number)', () => {
          const result = ChecklistUtil.validateAndParseImport('42', existingChecklist);
          expect(result.valid).toBe(false);
        });
      });
    });

    describe('isDuplicateChecklist', () => {
      const mockChecklist = [
        { id: 1, uid: 'uid-1', statement: 'Dependency checks' },
        { id: 2, uid: 'uid-2', statement: 'Data validation' }
      ];

      it('should return false if the input name or checklist is invalid', () => {
        expect(ChecklistUtil.isDuplicateChecklist(null, mockChecklist)).toBe(false);
        expect(ChecklistUtil.isDuplicateChecklist('Test', null)).toBe(false);
        expect(ChecklistUtil.isDuplicateChecklist('Test', {})).toBe(false);
      });

      it('should return true if an exact duplicate exists', () => {
        expect(ChecklistUtil.isDuplicateChecklist('Dependency checks', mockChecklist)).toBe(true);
      });

      it('should return true if a case-insensitive duplicate exists', () => {
        expect(ChecklistUtil.isDuplicateChecklist('DEPENDENCY checks', mockChecklist)).toBe(true);
        expect(ChecklistUtil.isDuplicateChecklist('data validation', mockChecklist)).toBe(true);
      });

      it('should return false if the name is entirely unique', () => {
        expect(ChecklistUtil.isDuplicateChecklist('New custom check', mockChecklist)).toBe(false);
      });

      it('should ignore the duplicate check if the matching item matches the excludeId (edit mode)', () => {
        expect(ChecklistUtil.isDuplicateChecklist('Data validation', mockChecklist, 'uid-2')).toBe(false);
      });

      it('should still flag a duplicate if edit mode name matches a DIFFERENT existing item', () => {
        expect(ChecklistUtil.isDuplicateChecklist('Dependency checks', mockChecklist, 'uid-2')).toBe(true);
      });
    });   
  });
});
