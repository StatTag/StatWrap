import fs from 'fs';
import os from 'os';
import AssetService from '../../../app/services/assets/asset';

jest.mock('fs');
jest.mock('os');

const TEST_USER_HOME_PATH = '/User/test/';
os.homedir.mockReturnValue(TEST_USER_HOME_PATH);

describe('services', () => {
  describe('assets', () => {
    afterEach(() => {
      jest.restoreAllMocks();
      jest.clearAllMocks();
    });

    describe('scan', () => {
      it('should throw an exception for an invalid directory', () => {
        fs.accessSync.mockReturnValue(false);
        const service = new AssetService();
        expect(() => service.scan(null)).toThrow(Error);
        expect(() => service.scan(undefined)).toThrow(Error);
        expect(() => service.scan('~/Test/Invalid/Path')).toThrow(Error);
      });
    });
  });
});
