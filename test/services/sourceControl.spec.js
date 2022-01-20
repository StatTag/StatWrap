import fs from 'fs';
import SourceControlService from '../../app/services/sourceControl';

jest.mock('fs');

describe('services', () => {
  /*
  beforeEach(() => {
    fs.readFileSync = jest.fn();
  });

  afterEach(() => {
    fs.readFileSync.mockClear();
  });
  */

  describe('sourceControl', () => {
    afterEach(() => {
      jest.restoreAllMocks();
      jest.clearAllMocks();
    });

    describe('hasSourceControlEnabled', () => {
      it('should return false for empty file paths', () => {
        expect(new SourceControlService().hasSourceControlEnabled(null)).toBe(false);
      });
    });
  });
});
