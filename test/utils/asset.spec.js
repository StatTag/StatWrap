import AssetUtil from '../../app/utils/asset';
import Constants from '../../app/constants/constants';

describe('services', () => {
  describe('AssetUtil', () => {
    describe('getHandlerMetadata', () => {
      it('should return null when there is no metadata', () => {
        expect(AssetUtil.getHandlerMetadata('Test.Id', null)).toBeNull();
        expect(AssetUtil.getHandlerMetadata('Test.Id', undefined)).toBeNull();
        expect(AssetUtil.getHandlerMetadata('Test.Id', [])).toBeNull();
      });

      it('should return null when the handler ID is not defined', () => {
        expect(AssetUtil.getHandlerMetadata(null, [{}])).toBeNull();
        expect(AssetUtil.getHandlerMetadata(undefined, [{}])).toBeNull();
        expect(AssetUtil.getHandlerMetadata('', [{}])).toBeNull();
      });

      it('should return a matching metadata entry by ID', () => {
        const metadata = [
          {
            id: 'Test.Id',
            value: true
          },
          null,
          {
            id: 'Other.Id',
            value: false
          }
        ];
        expect(AssetUtil.getHandlerMetadata('Test.Id', metadata)).not.toBeNull();
        expect(AssetUtil.getHandlerMetadata('INVALID', metadata)).toBeNull();
      });
    });

    describe('shouldConvertPath', () => {
      it('should return false when there is no asset', () => {
        expect(AssetUtil.shouldConvertPath(null)).toBe(false);
        expect(AssetUtil.shouldConvertPath(undefined)).toBe(false);
      });

      it('should return false when there is no type specified', () => {
        expect(AssetUtil.shouldConvertPath({})).toBe(false);
        expect(AssetUtil.shouldConvertPath({ type: null })).toBe(false);
        expect(AssetUtil.shouldConvertPath({ type: undefined })).toBe(false);
      });

      it('should return false when the type is not a file system type', () => {
        expect(AssetUtil.shouldConvertPath({ type: 'other' })).toBe(false);
        expect(AssetUtil.shouldConvertPath({ type: 'fileish' })).toBe(false);
      });

      it('should return true when the type is a file system type', () => {
        expect(AssetUtil.shouldConvertPath({ type: Constants.AssetType.FILE })).toBe(true);
        expect(AssetUtil.shouldConvertPath({ type: Constants.AssetType.DIRECTORY })).toBe(true);
        expect(AssetUtil.shouldConvertPath({ type: Constants.AssetType.FOLDER })).toBe(true);
      });
    });

    describe('filterIncludedFileAssets', () => {
      it('should return null if no asset is provided', () => {
        expect(AssetUtil.filterIncludedFileAssets(null)).toBeNull();
        expect(AssetUtil.filterIncludedFileAssets(undefined)).toBeNull();
      });

      it('should return null if the asset is not included', () => {
        const asset = {
          uri: '/Test/Asset',
          metadata: [
            {
              id: 'StatWrap.FileHandler',
              include: false
            }
          ]
        };
        expect(AssetUtil.filterIncludedFileAssets(asset)).toBeNull();
      });

      it('should handle when the children collection is not defined', () => {
        const asset = {
          uri: '/Test/Asset',
          metadata: [
            {
              id: 'StatWrap.FileHandler',
              include: true
            }
          ]
        };
        expect(AssetUtil.filterIncludedFileAssets(asset)).not.toBeNull();

        asset.children = null;
        expect(AssetUtil.filterIncludedFileAssets(asset)).not.toBeNull();

        asset.children = undefined;
        expect(AssetUtil.filterIncludedFileAssets(asset)).not.toBeNull();

        asset.children = [];
        expect(AssetUtil.filterIncludedFileAssets(asset)).not.toBeNull();
      });

      it('should return an empty children array if none are included', () => {
        const asset = {
          uri: '/Test/Asset',
          metadata: [
            {
              id: 'StatWrap.FileHandler',
              include: true
            }
          ],
          children: [
            {
              uri: '/Test/Asset/Child1',
              metadata: [
                {
                  id: 'StatWrap.FileHandler',
                  include: false
                }
              ]
            },
            {
              uri: '/Test/Asset/Child2',
              metadata: [
                {
                  id: 'StatWrap.FileHandler',
                  include: false
                }
              ]
            }
          ]
        };
        expect(AssetUtil.filterIncludedFileAssets(asset).children.length).toEqual(0);
      });

      it('should return a children array that contains included items', () => {
        const asset = {
          uri: '/Test/Asset',
          metadata: [
            {
              id: 'StatWrap.FileHandler',
              include: true
            }
          ],
          children: [
            {
              uri: '/Test/Asset/Child1',
              metadata: [
                {
                  id: 'StatWrap.FileHandler',
                  include: true
                }
              ]
            },
            {
              uri: '/Test/Asset/Child2',
              metadata: [
                {
                  id: 'StatWrap.FileHandler',
                  include: false
                }
              ]
            },
            {
              uri: '/Test/Asset/Child3',
              metadata: [
                {
                  id: 'StatWrap.FileHandler',
                  include: true
                }
              ]
            }
          ]
        };
        const filteredAsset = AssetUtil.filterIncludedFileAssets(asset);
        expect(filteredAsset.children.length).toEqual(2);
        expect(filteredAsset.children[0].uri).toEqual(asset.children[0].uri);
        expect(filteredAsset.children[1].uri).toEqual(asset.children[2].uri);
      });

      it('should handle processing nested children and not modify the original object', () => {
        const asset = {
          uri: '/Test/Asset',
          metadata: [
            {
              id: 'StatWrap.FileHandler',
              include: true
            }
          ],
          children: [
            {
              uri: '/Test/Asset/Child1',
              metadata: [
                {
                  id: 'StatWrap.FileHandler',
                  include: false
                }
              ]
            },
            {
              uri: '/Test/Asset/Child2',
              metadata: [
                {
                  id: 'StatWrap.FileHandler',
                  include: false
                }
              ],
              children: [
                {
                  uri: '/Test/Asset/Child2/Child1',
                  metadata: [
                    {
                      id: 'StatWrap.FileHandler',
                      include: true // Even though this is include, the parent is hidden
                    }
                  ]
                }
              ]
            },
            {
              uri: '/Test/Asset/Child3',
              metadata: [
                {
                  id: 'StatWrap.FileHandler',
                  include: true
                }
              ],
              children: [
                {
                  uri: '/Test/Asset/Child3/Child1',
                  metadata: [
                    {
                      id: 'StatWrap.FileHandler',
                      include: false
                    }
                  ]
                },
                {
                  uri: '/Test/Asset/Child3/Child2',
                  metadata: [
                    {
                      id: 'StatWrap.FileHandler',
                      include: true
                    }
                  ]
                }
              ]
            }
          ]
        };
        const filteredAsset = AssetUtil.filterIncludedFileAssets(asset);
        expect(filteredAsset.children.length).toEqual(1);
        expect(filteredAsset.children[0].uri).toEqual(asset.children[2].uri);
        expect(filteredAsset.children[0].children.length).toEqual(1);
        // This is what's testing that we didn't modify the original object.  If
        // we had modified it, this access of the descendant would fail.
        expect(filteredAsset.children[0].children[0].uri).toEqual(
          asset.children[2].children[1].uri
        );
      });
    });

    describe('findChildAssetByUri', () => {
      it('should return null if the asset is not specified', () => {
        expect(AssetUtil.findChildAssetByUri(null, '/Test')).toBeNull();
        expect(AssetUtil.findChildAssetByUri(undefined, '/Test')).toBeNull();
      });

      it('should return null if the URI is not specified', () => {
        expect(AssetUtil.findChildAssetByUri({}, null)).toBeNull();
        expect(AssetUtil.findChildAssetByUri({}, undefined)).toBeNull();
      });

      it('should return null if the asset children collection is not specified', () => {
        expect(AssetUtil.findChildAssetByUri({}, '/Test')).toBeNull();
        expect(AssetUtil.findChildAssetByUri({ children: null }, '/Test')).toBeNull();
        expect(AssetUtil.findChildAssetByUri({ children: undefined }, '/Test')).toBeNull();
      });

      it('should should return null if there is no matching child', () => {
        expect(AssetUtil.findChildAssetByUri({ children: [] }, '/Test')).toBeNull();
        expect(
          AssetUtil.findChildAssetByUri({ children: [{ uri: '/Test2' }] }, '/Test')
        ).toBeNull();
        // We expect case to match exactly for URI
        expect(AssetUtil.findChildAssetByUri({ children: [{ uri: '/TeST' }] }, '/Test')).toBeNull();
      });

      it('should should return the child when matched on URI', () => {
        const asset = {
          children: [
            { uri: '/Test1', test: 1 },
            { uri: '/Test2', test: 2 },
            { uri: '/Test3', test: 3 }
          ]
        };
        expect(AssetUtil.findChildAssetByUri(asset, '/Test1').test).toBe(1);
        expect(AssetUtil.findChildAssetByUri(asset, '/Test2').test).toBe(2);
        expect(AssetUtil.findChildAssetByUri(asset, '/Test3').test).toBe(3);
      });
    });

    describe('findDescendantAssetByUri', () => {
      it('should return null if the asset is not specified', () => {
        expect(AssetUtil.findDescendantAssetByUri(null, '/Test')).toBeNull();
        expect(AssetUtil.findDescendantAssetByUri(undefined, '/Test')).toBeNull();
      });

      it('should return null if the URI is not specified', () => {
        expect(AssetUtil.findDescendantAssetByUri({}, null)).toBeNull();
        expect(AssetUtil.findDescendantAssetByUri({}, undefined)).toBeNull();
      });

      it('should return a match if the root asset matches', () => {
        expect(AssetUtil.findDescendantAssetByUri({ uri: '/Test' }, '/Test')).not.toBeNull();
      });

      it('should return null if the asset children collection is not specified', () => {
        expect(AssetUtil.findDescendantAssetByUri({}, '/Test')).toBeNull();
        expect(AssetUtil.findDescendantAssetByUri({ children: null }, '/Test')).toBeNull();
        expect(AssetUtil.findDescendantAssetByUri({ children: undefined }, '/Test')).toBeNull();
      });

      it('should should return null if there is no matching descendant', () => {
        expect(AssetUtil.findDescendantAssetByUri({ children: [] }, '/Test')).toBeNull();
        expect(
          AssetUtil.findDescendantAssetByUri({ children: [{ uri: '/Test2' }] }, '/Test')
        ).toBeNull();
        // We expect case to match exactly for URI
        expect(
          AssetUtil.findDescendantAssetByUri({ children: [{ uri: '/TeST' }] }, '/Test')
        ).toBeNull();
      });

      it('should should return the descendant when matched on URI', () => {
        const asset = {
          children: [
            {
              uri: '/Test1',
              test: 1,
              children: [
                { uri: '/Test1/a', test: 4 },
                { uri: '/Test1/b', test: 5 }
              ]
            },
            { uri: '/Test2', test: 2 },
            {
              uri: '/Test3',
              test: 3,
              children: [
                { uri: '/Test3/a', test: 6 },
                { uri: '/Test3/b', test: 7 }
              ]
            }
          ]
        };
        expect(AssetUtil.findDescendantAssetByUri(asset, '/Test1').test).toBe(1);
        expect(AssetUtil.findDescendantAssetByUri(asset, '/Test2').test).toBe(2);
        expect(AssetUtil.findDescendantAssetByUri(asset, '/Test3').test).toBe(3);
        expect(AssetUtil.findDescendantAssetByUri(asset, '/Test1/a').test).toBe(4);
        expect(AssetUtil.findDescendantAssetByUri(asset, '/Test1/b').test).toBe(5);
        expect(AssetUtil.findDescendantAssetByUri(asset, '/Test3/a').test).toBe(6);
        expect(AssetUtil.findDescendantAssetByUri(asset, '/Test3/b').test).toBe(7);
      });
    });

    describe('getAllNotes', () => {
      it('should return an empty array if the asset is not specified', () => {
        expect(AssetUtil.getAllNotes(null)).toBeArrayOfSize(0);
        expect(AssetUtil.getAllNotes(undefined)).toBeArrayOfSize(0);
      });

      it('should should return an empty array when there are no notes', () => {
        const asset = {
          children: []
        };
        expect(AssetUtil.getAllNotes(asset)).toBeArrayOfSize(0);
      });

      it('should should return the notes for a shallow asset', () => {
        const asset = {
          uri: '/test/1',
          notes: [
            {
              id: '1',
              author: 'test',
              updated: '2021-01-01',
              content: 'Test note',
              uri: '/testt/1'
            }
          ]
        };
        expect(AssetUtil.getAllNotes(asset)).toBeArrayOfSize(1);
      });

      it('should should return the notes for a nested asset and descendants', () => {
        const asset = {
          uri: '/test/1',
          notes: [
            {
              id: '1',
              author: 'test',
              updated: '2021-01-01',
              content: 'Test note 1'
            }
          ],
          children: [
            {
              uri: '/test/1/1',
              notes: [
                {
                  id: '2',
                  author: 'test',
                  updated: '2021-01-01',
                  content: 'Test note 2'
                }
              ],
              children: [
                {
                  uri: '/test/1/1/1',
                  notes: [
                    {
                      id: '3',
                      author: 'test',
                      updated: '2021-01-01',
                      content: 'Test note 3'
                    }
                  ]
                }
              ]
            },
            {
              uri: '/test/1/2',
              notes: [
                {
                  id: '4',
                  author: 'test',
                  updated: '2021-01-01',
                  content: 'Test note 4'
                },
                {
                  id: '5',
                  author: 'test',
                  updated: '2021-01-01',
                  content: 'Test note 5'
                }
              ],
              children: []
            }
          ]
        };
        expect(AssetUtil.getAllNotes(asset)).toBeArrayOfSize(5);
      });
    });

    describe('getAssetNameFromUri', () => {
      it('should return an empty string for an undefined/empty parameter', () => {
        expect(AssetUtil.getAssetNameFromUri(null)).toEqual('');
        expect(AssetUtil.getAssetNameFromUri(undefined)).toEqual('');
      });

      it.onWindows('should return the name and extension for a string URI', () => {
        expect(AssetUtil.getAssetNameFromUri('C:\\Test\\Path\\file.test')).toEqual('file.test');
        expect(AssetUtil.getAssetNameFromUri('file.test')).toEqual('file.test');
      });

      it.onMac('should return the name and extension for a string URI', () => {
        expect(AssetUtil.getAssetNameFromUri('/Test/Path/file.test')).toEqual('file.test');
        expect(AssetUtil.getAssetNameFromUri('file.test')).toEqual('file.test');
      });

      it.onWindows(
        'should return the name and extension for an object containing a uri attribute',
        () => {
          expect(AssetUtil.getAssetNameFromUri({ uri: 'C:\\Test\\Path\\file.test' })).toEqual(
            'file.test'
          );
          expect(AssetUtil.getAssetNameFromUri({ uri: 'file.test' })).toEqual('file.test');
        }
      );

      it.onMac(
        'should return the name and extension for an object containing a uri attribute',
        () => {
          expect(AssetUtil.getAssetNameFromUri({ uri: '/Test/Path/file.test' })).toEqual(
            'file.test'
          );
          expect(AssetUtil.getAssetNameFromUri({ uri: 'file.test' })).toEqual('file.test');
        }
      );

      it('should return an empty string for an object without a uri attribute', () => {
        expect(AssetUtil.getAssetNameFromUri({})).toEqual('');
        expect(AssetUtil.getAssetNameFromUri({ uriii: 'test' })).toEqual('');
      });
    });

    describe('relativeToAbsolutePath', () => {
      it('should return null if given an empty object', () => {
        expect(AssetUtil.relativeToAbsolutePath('/root/path', null)).toBe(null);
        expect(AssetUtil.relativeToAbsolutePath('/root/path', undefined)).toBe(null);
      });

      it('should return null if no uri attribute is provided', () => {
        expect(AssetUtil.relativeToAbsolutePath('/root/path', {})).toBe(null);
      });

      it.onMac('should return the root path if the uri is empty', () => {
        expect(AssetUtil.relativeToAbsolutePath('/root/path', { uri: '' })).toBe('/root/path');
        // Trailing spaces are preserved on macOS
        expect(AssetUtil.relativeToAbsolutePath('/root/path', { uri: '  ' })).toBe('/root/path/  ');
      });
      it.onWindows('should return the root path if the uri is empty', () => {
        expect(AssetUtil.relativeToAbsolutePath('C:\\root\\path', { uri: '' })).toBe(
          'C:\\root\\path'
        );
        // Trailing spaces are preserved on macOS
        expect(AssetUtil.relativeToAbsolutePath('C:\\root\\path', { uri: '  ' })).toBe(
          'C:\\root\\path\\  '
        );
      });

      // We don't need to replicate full tests for path.resolve (which this function is using), but we do
      // want to establish a few tests to document our expected behavior.
      it.onMac('should resolve the absolute path', () => {
        expect(AssetUtil.relativeToAbsolutePath('/root/path', { uri: 'a' })).toBe('/root/path/a');
        expect(AssetUtil.relativeToAbsolutePath('/root/path', { uri: './a' })).toBe('/root/path/a');
        expect(AssetUtil.relativeToAbsolutePath('/root/path', { uri: 'a/b/c/d' })).toBe(
          '/root/path/a/b/c/d'
        );
        // TODO: Need an assessment if this is a security risk and if we should restrict how we navigate
        // beyond the project root
        expect(AssetUtil.relativeToAbsolutePath('/root/path', { uri: '../a' })).toBe('/root/a');
        expect(AssetUtil.relativeToAbsolutePath('/root/path', { uri: 'a/..' })).toBe('/root/path');
      });
      it.onWindows('should resolve the absolute path', () => {
        expect(AssetUtil.relativeToAbsolutePath('C:\\root\\path', { uri: 'a' })).toBe(
          'C:\\root\\path\\a'
        );
        expect(AssetUtil.relativeToAbsolutePath('C:\\root\\path', { uri: './a' })).toBe(
          'C:\\root\\path\\a'
        );
        expect(AssetUtil.relativeToAbsolutePath('C:\\root\\path', { uri: 'a/b/c/d' })).toBe(
          'C:\\root\\path\\a\\b\\c\\d'
        );
        // TODO: Need an assessment if this is a security risk and if we should restrict how we navigate
        // beyond the project root
        expect(AssetUtil.relativeToAbsolutePath('C:\\root\\path', { uri: '..\\a' })).toBe(
          'C:\\root\\a'
        );
        expect(AssetUtil.relativeToAbsolutePath('C:\\root\\path', { uri: 'a\\..' })).toBe(
          'C:\\root\\path'
        );
      });
    });

    describe('recursiveRelativeToAbsolutePath', () => {
      it('should return an empty asset object if that is what is passed in', () => {
        expect(AssetUtil.recursiveRelativeToAbsolutePath('/root/path', null)).toBe(null);
        expect(AssetUtil.recursiveRelativeToAbsolutePath('/root/path', undefined)).toBe(undefined);
      });

      it('should return the asset object if the project path is not provided', () => {
        const assets = {
          uri: '/tmp/root'
        };
        expect(AssetUtil.recursiveRelativeToAbsolutePath(null, assets)).toBe(assets);
        expect(AssetUtil.recursiveRelativeToAbsolutePath(undefined, assets)).toBe(assets);
      });

      it.onMac('should make all relative paths into absolute paths', () => {
        const assets = {
          uri: '',
          type: 'directory',
          children: [
            {
              uri: 'a',
              type: 'directory',
              children: [
                {
                  uri: 'a/b',
                  type: 'file'
                }
              ]
            },
            {
              uri: 'b',
              type: 'file'
            }
          ]
        };
        // This is the answer we expect
        const absolutePathAssets = {
          uri: '/root/path',
          type: 'directory',
          children: [
            {
              uri: '/root/path/a',
              type: 'directory',
              children: [
                {
                  uri: '/root/path/a/b',
                  type: 'file'
                }
              ]
            },
            {
              uri: '/root/path/b',
              type: 'file'
            }
          ]
        };
        expect(AssetUtil.recursiveRelativeToAbsolutePath('/root/path', assets)).toStrictEqual(
          absolutePathAssets
        );
      });

      it.onWindows('should make all relative paths into absolute paths', () => {
        const assets = {
          uri: '',
          type: 'directory',
          children: [
            {
              uri: 'a',
              type: 'directory',
              children: [
                {
                  uri: 'a/b',
                  type: 'file'
                }
              ]
            },
            {
              uri: 'b',
              type: 'file'
            }
          ]
        };
        // This is the answer we expect
        const absolutePathAssets = {
          uri: 'C:\\root\\path',
          type: 'directory',
          children: [
            {
              uri: 'C:\\root\\path\\a',
              type: 'directory',
              children: [
                {
                  uri: 'C:\\root\\path\\a\\b',
                  type: 'file'
                }
              ]
            },
            {
              uri: 'C:\\root\\path\\b',
              type: 'file'
            }
          ]
        };
        expect(AssetUtil.recursiveRelativeToAbsolutePath('C:\\root\\path', assets)).toStrictEqual(
          absolutePathAssets
        );
      });

      it.onMac('should not modify non-file and non-directory entries', () => {
        const assets = {
          uri: '',
          type: 'directory',
          children: [
            {
              uri: 'https://api',
              type: 'api',
              children: [
                {
                  uri: 'https://api/a/b',
                  type: 'api'
                }
              ]
            },
            {
              uri: 'README.md',
              type: 'file'
            },
            {
              uri: 'b',
              type: 'database'
            }
          ]
        };
        // This is the answer we expect
        const absolutePathAssets = {
          uri: '/root/path',
          type: 'directory',
          children: [
            {
              uri: 'https://api',
              type: 'api',
              children: [
                {
                  uri: 'https://api/a/b',
                  type: 'api'
                }
              ]
            },
            {
              uri: '/root/path/README.md',
              type: 'file'
            },
            {
              uri: 'b',
              type: 'database'
            }
          ]
        };
        expect(AssetUtil.recursiveRelativeToAbsolutePath('/root/path', assets)).toStrictEqual(
          absolutePathAssets
        );
      });

      it.onWindows('should not modify non-file and non-directory entries', () => {
        const assets = {
          uri: '',
          type: 'directory',
          children: [
            {
              uri: 'https://api',
              type: 'api',
              children: [
                {
                  uri: 'https://api/a/b',
                  type: 'api'
                }
              ]
            },
            {
              uri: 'README.md',
              type: 'file'
            },
            {
              uri: 'b',
              type: 'database'
            }
          ]
        };
        // This is the answer we expect
        const absolutePathAssets = {
          uri: 'C:\\root\\path',
          type: 'directory',
          children: [
            {
              uri: 'https://api',
              type: 'api',
              children: [
                {
                  uri: 'https://api/a/b',
                  type: 'api'
                }
              ]
            },
            {
              uri: 'C:\\root\\path\\README.md',
              type: 'file'
            },
            {
              uri: 'b',
              type: 'database'
            }
          ]
        };
        expect(AssetUtil.recursiveRelativeToAbsolutePath('C:\\root\\path', assets)).toStrictEqual(
          absolutePathAssets
        );
      });
    });

    describe('absoluteToRelativePath', () => {
      it('should return null if given an empty object', () => {
        expect(AssetUtil.absoluteToRelativePath('/root/path', null)).toBe(null);
        expect(AssetUtil.absoluteToRelativePath('/root/path', undefined)).toBe(null);
      });

      it('should return null if no uri attribute is provided', () => {
        expect(AssetUtil.absoluteToRelativePath('/root/path', {})).toBe(null);
        expect(AssetUtil.absoluteToRelativePath('C:\\root\\path', {})).toBe(null);
      });

      it('should return null if the uri is not absolute', () => {
        expect(AssetUtil.absoluteToRelativePath('/root/path', { uri: '' })).toBe(null);
        // Trailing spaces are preserved on macOS
        expect(AssetUtil.absoluteToRelativePath('/root/path', { uri: '  ' })).toBe(null);
      });

      // We don't need to replicate full tests for path.resolve (which this function is using), but we do
      // want to establish a few tests to document our expected behavior.
      it.onMac('should resolve the absolute path', () => {
        expect(AssetUtil.absoluteToRelativePath('/root/path', { uri: '/root/path/a' })).toBe('a');
        expect(AssetUtil.absoluteToRelativePath('/root/path', { uri: '/root/path/a/b/c/d' })).toBe(
          'a/b/c/d'
        );
        // TODO: Need an assessment if this is a security risk and if we should restrict how we navigate
        // beyond the project root
        expect(AssetUtil.absoluteToRelativePath('/root/path', { uri: '/root/a' })).toBe('../a');
      });
      it.onWindows('should resolve the absolute path', () => {
        expect(
          AssetUtil.absoluteToRelativePath('C:\\root\\path', { uri: 'C:\\root\\path\\a' })
        ).toBe('a');
        expect(
          AssetUtil.absoluteToRelativePath('C:\\root\\path', { uri: 'C:\\root\\path\\a\\b\\c\\d' })
        ).toBe('a/b/c/d');
        // TODO: Need an assessment if this is a security risk and if we should restrict how we navigate
        // beyond the project root
        expect(AssetUtil.absoluteToRelativePath('C:\\root\\path', { uri: 'C:\\root\\a' })).toBe(
          '../a'
        );
      });
    });

    describe('recursiveAbsoluteToRelativePath', () => {
      it('should return an empty asset object if that is what is passed in', () => {
        expect(AssetUtil.recursiveAbsoluteToRelativePath('/root/path', null)).toBe(null);
        expect(AssetUtil.recursiveAbsoluteToRelativePath('/root/path', undefined)).toBe(undefined);
      });

      it('should return the asset object if the project path is not provided', () => {
        const assets = {
          uri: '/tmp/root'
        };
        expect(AssetUtil.recursiveAbsoluteToRelativePath(null, assets)).toBe(assets);
        expect(AssetUtil.recursiveAbsoluteToRelativePath(undefined, assets)).toBe(assets);
      });

      it.onMac('should make all absolute paths into relative paths', () => {
        const relativePathAssets = {
          uri: '',
          type: 'directory',
          children: [
            {
              uri: 'a',
              type: 'directory',
              children: [
                {
                  uri: 'a/b',
                  type: 'file'
                }
              ]
            },
            {
              uri: 'b',
              type: 'file'
            }
          ]
        };
        // This is the answer we expect
        const absolutePathAssets = {
          uri: '/root/path',
          type: 'directory',
          children: [
            {
              uri: '/root/path/a',
              type: 'directory',
              children: [
                {
                  uri: '/root/path/a/b',
                  type: 'file'
                }
              ]
            },
            {
              uri: '/root/path/b',
              type: 'file'
            }
          ]
        };
        expect(
          AssetUtil.recursiveAbsoluteToRelativePath('/root/path', absolutePathAssets)
        ).toStrictEqual(relativePathAssets);
      });
      it.onWindows('should make all absolute paths into relative paths', () => {
        const relativePathAssets = {
          uri: '',
          type: 'directory',
          children: [
            {
              uri: 'a',
              type: 'directory',
              children: [
                {
                  uri: 'a/b',
                  type: 'file'
                }
              ]
            },
            {
              uri: 'b',
              type: 'file'
            }
          ]
        };
        // This is the answer we expect
        const absolutePathAssets = {
          uri: 'C:\\root\\path',
          type: 'directory',
          children: [
            {
              uri: 'C:\\root\\path\\a',
              type: 'directory',
              children: [
                {
                  uri: 'C:\\root\\path\\a\\b',
                  type: 'file'
                }
              ]
            },
            {
              uri: 'C:\\root\\path\\b',
              type: 'file'
            }
          ]
        };
        expect(
          AssetUtil.recursiveAbsoluteToRelativePath('C:\\root\\path', absolutePathAssets)
        ).toStrictEqual(relativePathAssets);
      });

      it.onMac('should not modify non-file and non-directory entries', () => {
        const relativePathAssets = {
          uri: '',
          type: 'directory',
          children: [
            {
              uri: 'https://api',
              type: 'api',
              children: [
                {
                  uri: 'https://api/a/b',
                  type: 'api'
                }
              ]
            },
            {
              uri: 'README.md',
              type: 'file'
            },
            {
              uri: 'b',
              type: 'database'
            }
          ]
        };
        // This is the answer we expect
        const absolutePathAssets = {
          uri: '/root/path',
          type: 'directory',
          children: [
            {
              uri: 'https://api',
              type: 'api',
              children: [
                {
                  uri: 'https://api/a/b',
                  type: 'api'
                }
              ]
            },
            {
              uri: '/root/path/README.md',
              type: 'file'
            },
            {
              uri: 'b',
              type: 'database'
            }
          ]
        };
        expect(
          AssetUtil.recursiveAbsoluteToRelativePath('/root/path', absolutePathAssets)
        ).toStrictEqual(relativePathAssets);
      });
      it.onWindows('should not modify non-file and non-directory entries', () => {
        const relativePathAssets = {
          uri: '',
          type: 'directory',
          children: [
            {
              uri: 'https://api',
              type: 'api',
              children: [
                {
                  uri: 'https://api/a/b',
                  type: 'api'
                }
              ]
            },
            {
              uri: 'README.md',
              type: 'file'
            },
            {
              uri: 'b',
              type: 'database'
            }
          ]
        };
        // This is the answer we expect
        const absolutePathAssets = {
          uri: 'C:\\root\\path',
          type: 'directory',
          children: [
            {
              uri: 'https://api',
              type: 'api',
              children: [
                {
                  uri: 'https://api/a/b',
                  type: 'api'
                }
              ]
            },
            {
              uri: 'C:\\root\\path\\README.md',
              type: 'file'
            },
            {
              uri: 'b',
              type: 'database'
            }
          ]
        };
        expect(
          AssetUtil.recursiveAbsoluteToRelativePath('C:\\root\\path', absolutePathAssets)
        ).toStrictEqual(relativePathAssets);
      });
    });

    describe('absoluteToRelativePathForArray', () => {
      it('should return an empty array if that is what is passed in', () => {
        expect(AssetUtil.absoluteToRelativePathForArray('/root/path', null)).toBe(null);
        expect(AssetUtil.absoluteToRelativePathForArray('/root/path', undefined)).toBe(undefined);
        expect(AssetUtil.absoluteToRelativePathForArray('/root/path', [])).toStrictEqual([]);
      });
      it.onMac('should not modify non-file and non-directory entries', () => {
        const absolutePathAssets = [
          {
            uri: '/root/path',
            type: 'directory'
          },
          {
            uri: 'https://api/a/b',
            type: 'api'
          },
          {
            uri: 'b',
            type: 'database'
          }
        ];
        // This is the answer we expect
        const relativePathAssets = [
          {
            uri: '',
            type: 'directory'
          },
          {
            uri: 'https://api/a/b',
            type: 'api'
          },
          {
            uri: 'b',
            type: 'database'
          }
        ];
        expect(
          AssetUtil.absoluteToRelativePathForArray('/root/path', absolutePathAssets)
        ).toStrictEqual(relativePathAssets);
      });
      it.onWindows('should not modify non-file and non-directory entries', () => {
        const absolutePathAssets = [
          {
            uri: 'C:\\root\\path',
            type: 'directory'
          },
          {
            uri: 'https://api/a/b',
            type: 'api'
          },
          {
            uri: 'b',
            type: 'database'
          }
        ];
        // This is the answer we expect
        const relativePathAssets = [
          {
            uri: '',
            type: 'directory'
          },
          {
            uri: 'https://api/a/b',
            type: 'api'
          },
          {
            uri: 'b',
            type: 'database'
          }
        ];
        expect(
          AssetUtil.absoluteToRelativePathForArray('C:\\root\\path', absolutePathAssets)
        ).toStrictEqual(relativePathAssets);
      });
      it.onMac('should modify file and directory entries', () => {
        const absolutePathAssets = [
          {
            uri: '/root/path',
            type: Constants.AssetType.DIRECTORY
          },
          {
            uri: '/root/path/folder',
            type: Constants.AssetType.FOLDER // Testing the alias for directory
          },
          {
            uri: '/root/path/folder/file',
            type: Constants.AssetType.FILE
          }
        ];
        // This is the answer we expect
        const relativePathAssets = [
          {
            uri: '',
            type: Constants.AssetType.DIRECTORY
          },
          {
            uri: 'folder',
            type: Constants.AssetType.FOLDER
          },
          {
            uri: 'folder/file',
            type: Constants.AssetType.FILE
          }
        ];
        expect(
          AssetUtil.absoluteToRelativePathForArray('/root/path', absolutePathAssets)
        ).toStrictEqual(relativePathAssets);
      });
      it.onWindows('should modify file and directory entries', () => {
        const absolutePathAssets = [
          {
            uri: 'C:\\root\\path',
            type: Constants.AssetType.DIRECTORY
          },
          {
            uri: 'C:\\root\\path\\folder',
            type: Constants.AssetType.FOLDER // Testing the alias for directory
          },
          {
            uri: 'C:\\root\\path\\folder\\file',
            type: Constants.AssetType.FILE
          }
        ];
        // This is the answer we expect
        const relativePathAssets = [
          {
            uri: '',
            type: Constants.AssetType.DIRECTORY
          },
          {
            uri: 'folder',
            type: Constants.AssetType.FOLDER
          },
          {
            uri: 'folder/file', // Note that we are normalizing to POSIX paths, so this is correct for Windows
            type: Constants.AssetType.FILE
          }
        ];
        expect(
          AssetUtil.absoluteToRelativePathForArray('C:\\root\\path', absolutePathAssets)
        ).toStrictEqual(relativePathAssets);
      });
    });

    describe('relativeToAbsolutePathForArray', () => {
      it('should return an empty array if that is what is passed in', () => {
        expect(AssetUtil.relativeToAbsolutePathForArray('/root/path', null)).toBe(null);
        expect(AssetUtil.relativeToAbsolutePathForArray('/root/path', undefined)).toBe(undefined);
        expect(AssetUtil.relativeToAbsolutePathForArray('/root/path', [])).toStrictEqual([]);
      });
      it.onMac('should not modify non-file and non-directory entries', () => {
        const absolutePathAssets = [
          {
            uri: '/root/path',
            type: 'directory'
          },
          {
            uri: 'https://api/a/b',
            type: 'api'
          },
          {
            uri: 'b',
            type: 'database'
          }
        ];
        // This is the answer we expect
        const relativePathAssets = [
          {
            uri: '',
            type: 'directory'
          },
          {
            uri: 'https://api/a/b',
            type: 'api'
          },
          {
            uri: 'b',
            type: 'database'
          }
        ];
        expect(
          AssetUtil.relativeToAbsolutePathForArray('/root/path', relativePathAssets)
        ).toStrictEqual(absolutePathAssets);
      });
      it.onWindows('should not modify non-file and non-directory entries', () => {
        const absolutePathAssets = [
          {
            uri: 'C:\\root\\path',
            type: 'directory'
          },
          {
            uri: 'https://api/a/b',
            type: 'api'
          },
          {
            uri: 'b',
            type: 'database'
          }
        ];
        // This is the answer we expect
        const relativePathAssets = [
          {
            uri: '',
            type: 'directory'
          },
          {
            uri: 'https://api/a/b',
            type: 'api'
          },
          {
            uri: 'b',
            type: 'database'
          }
        ];
        expect(
          AssetUtil.relativeToAbsolutePathForArray('C:\\root\\path', relativePathAssets)
        ).toStrictEqual(absolutePathAssets);
      });
      it.onMac('should modify file and directory entries', () => {
        const absolutePathAssets = [
          {
            uri: '/root/path',
            type: Constants.AssetType.DIRECTORY
          },
          {
            uri: '/root/path/folder',
            type: Constants.AssetType.FOLDER // Testing the alias for directory
          },
          {
            uri: '/root/path/folder/file',
            type: Constants.AssetType.FILE
          }
        ];
        // This is the answer we expect
        const relativePathAssets = [
          {
            uri: '',
            type: Constants.AssetType.DIRECTORY
          },
          {
            uri: 'folder',
            type: Constants.AssetType.FOLDER
          },
          {
            uri: 'folder/file',
            type: Constants.AssetType.FILE
          }
        ];
        expect(
          AssetUtil.relativeToAbsolutePathForArray('/root/path', relativePathAssets)
        ).toStrictEqual(absolutePathAssets);
      });
      it.onWindows('should modify file and directory entries', () => {
        const absolutePathAssets = [
          {
            uri: 'C:\\root\\path',
            type: Constants.AssetType.DIRECTORY
          },
          {
            uri: 'C:\\root\\path\\folder',
            type: Constants.AssetType.FOLDER // Testing the alias for directory
          },
          {
            uri: 'C:\\root\\path\\folder\\file',
            type: Constants.AssetType.FILE
          }
        ];
        // This is the answer we expect
        const relativePathAssets = [
          {
            uri: '',
            type: Constants.AssetType.DIRECTORY
          },
          {
            uri: 'folder',
            type: Constants.AssetType.FOLDER
          },
          {
            uri: 'folder\\file',
            type: Constants.AssetType.FILE
          }
        ];
        expect(
          AssetUtil.relativeToAbsolutePathForArray('C:\\root\\path', relativePathAssets)
        ).toStrictEqual(absolutePathAssets);
      });
    });

    describe('getExtensionFromUri', () => {
      it('should return an empty string for null/undefined/empty input', () => {
        expect(AssetUtil.getExtensionFromUri(null)).toBe('');
        expect(AssetUtil.getExtensionFromUri(undefined)).toBe('');
        expect(AssetUtil.getExtensionFromUri('')).toBe('');
      });
      it('returns simple file extensions cross-platform', () => {
        expect(AssetUtil.getExtensionFromUri('C:\\test.txt')).toBe('txt');
        expect(AssetUtil.getExtensionFromUri('/dev/test.txt')).toBe('txt');
        expect(AssetUtil.getExtensionFromUri('https://www.test.com/test.txt')).toBe('txt');
      });
      it('returns an empty string for hidden files without extensions', () => {
        expect(AssetUtil.getExtensionFromUri('C:\\test\\.htaccess')).toBe('');
        expect(AssetUtil.getExtensionFromUri('/dev/test/.htaccess')).toBe('');
        expect(AssetUtil.getExtensionFromUri('https://www.test.com/.htaccess')).toBe('');
      });
      it('returns the last of multi-extension files', () => {
        expect(AssetUtil.getExtensionFromUri('C:\\test.txt.pdf')).toBe('pdf');
        expect(AssetUtil.getExtensionFromUri('/dev/test.txt.pdf')).toBe('pdf');
        expect(AssetUtil.getExtensionFromUri('https://www.test.com/test.txt.pdf')).toBe('pdf');
      });
      it('returns extensions for hidden files with extensions', () => {
        expect(AssetUtil.getExtensionFromUri('C:\\test\\.htaccess.tmp')).toBe('tmp');
        expect(AssetUtil.getExtensionFromUri('/dev/test/.htaccess.tmp')).toBe('tmp');
        expect(AssetUtil.getExtensionFromUri('https://www.test.com/.htaccess.tmp')).toBe('tmp');
      });
      it('returns extensions for objects with uri parameter', () => {
        expect(AssetUtil.getExtensionFromUri({ uri: 'C:\\test.txt' })).toBe('txt');
        expect(AssetUtil.getExtensionFromUri({ uri: '/dev/test.txt' })).toBe('txt');
        expect(AssetUtil.getExtensionFromUri({ uri: 'https://www.test.com/test.txt' })).toBe('txt');
      });
    });
  });
});
