import { URL } from 'url';
import BaseCodeHandler from '../../../../app/services/assets/handlers/baseCode';

describe('services', () => {
  describe('BaseCodeHandler', () => {
    describe('getBaseFileName', () => {
      const handler = new BaseCodeHandler('test', []);

      it('should return the base name for a path-based URI', () => {
        expect(handler.getBaseFileName('/User/test/Project/code.R')).toEqual('code.R');
      });

      it('should trim a path-based URI before returning its base name', () => {
        expect(handler.getBaseFileName('  /User/test/Project/code.R  ')).toEqual('code.R');
      });

      it.onMac('should return the base name for a macOS path containing spaces', () => {
        expect(handler.getBaseFileName('/Users/test/My Project/my code.R')).toEqual(
          'my code.R',
        );
      });

      it('should return the base name for a Windows path using forward slashes', () => {
        expect(handler.getBaseFileName('C:/Users/test/Project/code.R')).toEqual('code.R');
      });

      it.onWindows('should return the base name for a Windows path using backslashes', () => {
        expect(handler.getBaseFileName('C:\\Users\\test\\My Project\\my code.R')).toEqual(
          'my code.R',
        );
      });

      it.onWindows('should trim a Windows path before returning its base name', () => {
        expect(handler.getBaseFileName('  C:\\Users\\test\\Project\\code.R  ')).toEqual(
          'code.R',
        );
      });

      it.onWindows('should return the base name for a Windows UNC path', () => {
        expect(handler.getBaseFileName('\\\\server\\share\\Project\\code.R')).toEqual(
          'code.R',
        );
      });

      it('should return the base name when constructing a URL throws an exception', () => {
        const uri = 'http://[invalid]/Project/code.R';
        expect(() => new URL(uri)).toThrow('Invalid URL');
        expect(handler.getBaseFileName(uri)).toEqual('code.R');
      });

      it('should return the base name for an unsupported FTP protocol', () => {
        expect(handler.getBaseFileName('ftp://example.com/Project/code.R')).toEqual('code.R');
      });

      it('should return the pathname for an HTTP URL without query or fragment', () => {
        expect(
          handler.getBaseFileName('http://example.com/Project/code.R?ref=123#section'),
        ).toEqual('/Project/code.R');
      });

      it('should return the pathname for an HTTPS URL', () => {
        expect(handler.getBaseFileName('https://example.com/Project/code.R')).toEqual(
          '/Project/code.R',
        );
      });
    });
  });
});
