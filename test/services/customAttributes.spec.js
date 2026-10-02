import CustomAttributesService from '../../app/services/customAttributes';

const fs = require('fs');
const path = require('path');
const os = require('os');

// Create a temporary directory for testing
const testProjectPath = path.join(os.tmpdir(), 'statwrap-test-custom-attrs');
const statwrapDir = path.join(testProjectPath, '.statwrap');
const filePath = path.join(statwrapDir, '.statwrap-custom-attributes.json');

describe('CustomAttributesService', () => {
  let service;

  beforeEach(() => {
    service = new CustomAttributesService();
    // Create the .statwrap directory for testing
    if (!fs.existsSync(statwrapDir)) {
      fs.mkdirSync(statwrapDir, { recursive: true });
    }
    // Clean up any existing file
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  });

  afterAll(() => {
    // Clean up test files
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    // Try to remove the test directories
    try {
      fs.rmdirSync(statwrapDir);
      fs.rmdirSync(testProjectPath);
    } catch (e) {
      // Ignore if directories are not empty or don't exist
    }
  });

  describe('getFilePath', () => {
    it('should return the correct file path for a project', () => {
      const result = service.getFilePath(testProjectPath);
      expect(result).toBe(filePath);
    });
  });

  describe('writeCustomAttributes', () => {
    it('should throw an error if project path is not provided', () => {
      expect(() => service.writeCustomAttributes(null, [])).toThrow(
        'Invalid project path or custom attributes data',
      );
    });

    it('should throw an error if attributes data is not provided', () => {
      expect(() => service.writeCustomAttributes(testProjectPath, null)).toThrow(
        'Invalid project path or custom attributes data',
      );
    });

    it('should write attributes to the file', () => {
      const attributes = [
        {
          id: 'custom_experimental',
          display: 'Experimental',
          type: 'bool',
          default: false,
          appliesTo: ['*'],
          source: 'custom',
        },
      ];
      service.writeCustomAttributes(testProjectPath, attributes);

      const fileContent = fs.readFileSync(filePath, 'utf8');
      const parsed = JSON.parse(fileContent);
      expect(parsed).toEqual(attributes);
    });

    it('should overwrite existing attributes with new data', () => {
      const initial = [{ id: 'custom_a', display: 'A', type: 'bool', source: 'custom' }];
      service.writeCustomAttributes(testProjectPath, initial);

      const updated = [
        { id: 'custom_a', display: 'A', type: 'bool', source: 'custom' },
        { id: 'custom_b', display: 'B', type: 'bool', source: 'custom' },
      ];
      service.writeCustomAttributes(testProjectPath, updated);

      const fileContent = fs.readFileSync(filePath, 'utf8');
      const parsed = JSON.parse(fileContent);
      expect(parsed).toHaveLength(2);
      expect(parsed[1].id).toBe('custom_b');
    });

    it('should write an empty array when all attributes are deleted', () => {
      service.writeCustomAttributes(testProjectPath, []);

      const fileContent = fs.readFileSync(filePath, 'utf8');
      const parsed = JSON.parse(fileContent);
      expect(parsed).toEqual([]);
    });
  });

  describe('loadCustomAttributes', () => {
    it('should return an error if project path is not provided', (done) => {
      service.loadCustomAttributes(null, (error, attributes) => {
        expect(error).toBe('The project path must be specified');
        expect(attributes).toBeNull();
        done();
      });
    });

    it('should return an empty array if the file does not exist', (done) => {
      service.loadCustomAttributes(testProjectPath, (error, attributes) => {
        expect(error).toBeNull();
        expect(attributes).toEqual([]);
        done();
      });
    });

    it('should load attributes from an existing file', (done) => {
      const attributes = [
        { id: 'custom_test', display: 'Test', type: 'bool', source: 'custom' },
      ];
      fs.writeFileSync(filePath, JSON.stringify(attributes));

      service.loadCustomAttributes(testProjectPath, (error, result) => {
        expect(error).toBeNull();
        expect(result).toEqual(attributes);
        expect(result).toHaveLength(1);
        expect(result[0].display).toBe('Test');
        done();
      });
    });

    it('should return an error if the file contains invalid JSON', (done) => {
      fs.writeFileSync(filePath, 'this is not valid json {{{');

      service.loadCustomAttributes(testProjectPath, (error, result) => {
        expect(error).toBe('Error reading or parsing custom attributes file');
        expect(result).toBeNull();
        done();
      });
    });

    it('should load multiple attributes correctly', (done) => {
      const attributes = [
        { id: 'custom_a', display: 'A', type: 'bool', source: 'custom' },
        { id: 'custom_b', display: 'B', type: 'bool', source: 'custom' },
        { id: 'custom_c', display: 'C', type: 'bool', source: 'custom' },
      ];
      fs.writeFileSync(filePath, JSON.stringify(attributes));

      service.loadCustomAttributes(testProjectPath, (error, result) => {
        expect(error).toBeNull();
        expect(result).toHaveLength(3);
        expect(result[2].id).toBe('custom_c');
        done();
      });
    });
  });
});