import AssetUtil from '../../app/utils/asset';

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
      it('should return null the asset is not specified', () => {
        expect(AssetUtil.findChildAssetByUri(null, '/Test')).toBeNull();
        expect(AssetUtil.findChildAssetByUri(undefined, '/Test')).toBeNull();
      });

      it('should return null the URI is not specified', () => {
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
  });
});