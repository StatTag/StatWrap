import ProjectUtil from '../../app/utils/project';
import Constants from '../../app/constants/constants';

describe('utils', () => {
  describe('ProjectUtil', () => {
    describe('getAssetFilters', () => {
      it('returns an empty filter for null/empty assets', () => {
        expect(ProjectUtil.getAssetFilters(null)).toStrictEqual([]);
        expect(ProjectUtil.getAssetFilters(undefined)).toStrictEqual([]);
        expect(ProjectUtil.getAssetFilters({})).toStrictEqual([]);
      });
      it('returns a filter list for an asset with no children', () => {
        expect(ProjectUtil.getAssetFilters({ type: Constants.AssetType.DIRECTORY })).toStrictEqual([
          {
            category: 'Asset Type',
            values: [
              {
                key: Constants.AssetType.DIRECTORY,
                label: Constants.AssetType.DIRECTORY,
                value: true
              }
            ]
          }
        ]);
      });
      it('returns a sorted, distinct filter list for an asset with descendants', () => {
        expect(
          ProjectUtil.getAssetFilters({
            type: Constants.AssetType.DIRECTORY,
            children: [
              {
                type: Constants.AssetType.DIRECTORY,
                children: [
                  { type: Constants.AssetType.FILE, contentType: Constants.AssetContentType.OTHER },
                  {
                    type: Constants.AssetType.FILE,
                    contentType: Constants.AssetContentType.CODE,
                    metadata: [
                      {
                        id: 'StatWrap.PythonHandler'
                      }
                    ]
                  }
                ]
              },
              // Not a real asset type, but lets us test the sorting
              { type: Constants.AssetType.DIRECTORY, children: [{ type: 'aaaaa' }] }
            ]
          })
        ).toStrictEqual([
          {
            category: 'Asset Type',
            values: [
              { key: 'aaaaa', label: 'aaaaa', value: true },
              {
                key: Constants.AssetType.DIRECTORY,
                label: Constants.AssetType.DIRECTORY,
                value: true
              },
              { key: Constants.AssetType.FILE, label: Constants.AssetType.FILE, value: true }
            ]
          },
          {
            category: 'Content Type',
            values: [
              {
                key: Constants.AssetContentType.CODE,
                label: Constants.AssetContentType.CODE,
                value: true
              },
              {
                key: Constants.AssetContentType.OTHER,
                label: Constants.AssetContentType.OTHER,
                value: true
              }
            ]
          },
          {
            category: 'Code File Type',
            values: [{ key: 'python', label: 'python', value: true }]
          }
        ]);
      });
    });

    describe('getWorkflowFilters', () => {
      it('returns an empty filter for null/empty assets', () => {
        expect(ProjectUtil.getWorkflowFilters(null)).toStrictEqual([]);
        expect(ProjectUtil.getWorkflowFilters(undefined)).toStrictEqual([]);
        expect(ProjectUtil.getWorkflowFilters({})).toStrictEqual([]);
      });
      it('returns an empty filter for an asset with no children', () => {
        expect(
          ProjectUtil.getWorkflowFilters({ type: Constants.AssetType.DIRECTORY })
        ).toStrictEqual([]);
      });
    });

    describe('getFilteredAssets', () => {
      it('returns null for null/empty assets', () => {
        expect(ProjectUtil.getFilteredAssets(null, [])).toBeNull();
        expect(ProjectUtil.getFilteredAssets(undefined, [])).toBeNull();
      });
      it('returns the assets for null/empty filters', () => {
        const assets = {
          uri: 'test1'
        };
        expect(ProjectUtil.getFilteredAssets(assets, null)).toStrictEqual(assets);
        expect(ProjectUtil.getFilteredAssets(assets, undefined)).toStrictEqual(assets);
        expect(ProjectUtil.getFilteredAssets(assets, [])).toStrictEqual(assets);
      });
      it('returns the original asset if a single asset meets the filters', () => {
        const filters = [
          {
            category: 'Asset Type',
            values: [
              {
                key: Constants.AssetType.DIRECTORY,
                label: Constants.AssetType.DIRECTORY,
                value: true
              }
            ]
          }
        ];
        const assets = {
          uri: 'test1',
          type: Constants.AssetType.DIRECTORY
        };
        expect(ProjectUtil.getFilteredAssets(assets, filters)).toStrictEqual(assets);
      });
      it('returns null/empty if a single asset does not meet the filters', () => {
        const filters = [
          {
            category: 'Asset Type',
            values: [
              {
                key: Constants.AssetType.DIRECTORY,
                label: Constants.AssetType.DIRECTORY,
                value: false
              }
            ]
          }
        ];
        const assets = {
          uri: 'test1',
          type: Constants.AssetType.DIRECTORY
        };
        expect(ProjectUtil.getFilteredAssets(assets, filters)).toBeNull();
      });
      it('returns the collection of assets if we filter out directories', () => {
        const filters = [
          {
            category: 'Asset Type',
            values: [
              {
                key: Constants.AssetType.DIRECTORY,
                label: Constants.AssetType.DIRECTORY,
                value: false
              }
            ]
          }
        ];
        const assets = {
          uri: 'test1',
          type: Constants.AssetType.DIRECTORY,
          children: [
            {
              uri: 'test1/test2',
              type: Constants.AssetType.DIRECTORY,
              children: [
                {
                  uri: 'test1/test2/a',
                  type: Constants.AssetType.FILE,
                  contentType: Constants.AssetContentType.OTHER
                },
                {
                  uri: 'test1/test2/b',
                  type: Constants.AssetType.FILE,
                  contentType: Constants.AssetContentType.CODE
                }
              ]
            },
            {
              uri: 'test1/test3',
              type: Constants.AssetType.DIRECTORY,
              children: [
                {
                  uri: 'test1/test3/c',
                  type: Constants.AssetType.FILE,
                  contentType: Constants.AssetContentType.CODE
                }
              ]
            }
          ]
        };
        expect(ProjectUtil.getFilteredAssets(assets, filters)).toStrictEqual({
          children: [
            {
              children: [
                {
                  uri: 'test1/test2/a',
                  type: Constants.AssetType.FILE,
                  contentType: Constants.AssetContentType.OTHER
                },
                {
                  uri: 'test1/test2/b',
                  type: Constants.AssetType.FILE,
                  contentType: Constants.AssetContentType.CODE
                }
              ]
            },
            {
              children: [
                {
                  uri: 'test1/test3/c',
                  type: Constants.AssetType.FILE,
                  contentType: Constants.AssetContentType.CODE
                }
              ]
            }
          ]
        });
      });
      it('applies multiple filters and filters out empty directories', () => {
        const filters = [
          {
            category: 'Asset Type',
            values: [
              {
                key: Constants.AssetType.DIRECTORY,
                label: Constants.AssetType.DIRECTORY,
                value: false
              },
              {
                key: Constants.AssetType.FILE,
                label: Constants.AssetType.FILE,
                value: true
              }
            ]
          },
          {
            category: 'Content Type',
            values: [
              {
                key: Constants.AssetContentType.CODE,
                label: Constants.AssetContentType.CODE,
                value: false
              }
            ]
          }
        ];
        const assets = {
          uri: 'test1',
          type: Constants.AssetType.DIRECTORY,
          children: [
            {
              uri: 'test1/test2',
              type: Constants.AssetType.DIRECTORY,
              children: [
                {
                  uri: 'test1/test2/a',
                  type: Constants.AssetType.FILE,
                  contentType: Constants.AssetContentType.OTHER
                },
                {
                  uri: 'test1/test2/b',
                  type: Constants.AssetType.FILE,
                  contentType: Constants.AssetContentType.CODE
                }
              ]
            },
            {
              uri: 'test1/test3',
              type: Constants.AssetType.DIRECTORY,
              children: [
                {
                  uri: 'test1/test3/c',
                  type: Constants.AssetType.FILE,
                  contentType: Constants.AssetContentType.CODE
                }
              ]
            }
          ]
        };
        expect(ProjectUtil.getFilteredAssets(assets, filters)).toStrictEqual({
          children: [
            {
              children: [
                {
                  uri: 'test1/test2/a',
                  type: Constants.AssetType.FILE,
                  contentType: Constants.AssetContentType.OTHER
                }
              ]
            }
          ]
        });
      });
    });
  });
});
