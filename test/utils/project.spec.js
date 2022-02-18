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
            values: [Constants.AssetType.DIRECTORY]
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
            values: ['aaaaa', Constants.AssetType.DIRECTORY, Constants.AssetType.FILE]
          },
          {
            category: 'Content Type',
            values: [Constants.AssetContentType.CODE, Constants.AssetContentType.OTHER]
          },
          {
            category: 'Code File Type',
            values: ['python']
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
          id: 'test1'
        };
        expect(ProjectUtil.getFilteredAssets(assets, null)).toStrictEqual(assets);
        expect(ProjectUtil.getFilteredAssets(assets, undefined)).toStrictEqual(assets);
        expect(ProjectUtil.getFilteredAssets(assets, [])).toStrictEqual(assets);
      });
    });
  });
});
