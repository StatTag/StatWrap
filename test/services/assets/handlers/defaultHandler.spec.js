import fs from 'fs';
import os from 'os';
import DefaultHandler from '../../../../app/services/assets/handlers/defaultHandler';

jest.mock('fs');
jest.mock('os');

const TEST_USER_HOME_PATH = '/User/test/';
os.homedir.mockReturnValue(TEST_USER_HOME_PATH);

describe('services', () => {
  describe('defaultHandler', () => {
    afterEach(() => {
      jest.restoreAllMocks();
      jest.clearAllMocks();
    });

    describe('id', () => {
      it('should return an id that matches the class name', () => {
        expect(new DefaultHandler().id()).toEqual(DefaultHandler.name);
      });
    });

    describe('scan', () => {
      it('should return a response with just the handler name if the file is not accessible', () => {
        fs.accessSync.mockReturnValue(false);
        const response = new DefaultHandler().scan('/Some/Invalid/Path');
      });
    });
  });
});
