/* eslint-disable no-underscore-dangle */
// Note: uuid mocking fixed/broke/fixed?  May need to remove this line
// if it breaks again.
import { v4 as uuid } from 'uuid';
import ProjectUtil from '../../app/utils/project';
import Constants from '../../app/constants/constants';
import WorkflowUtil from '../../app/utils/workflow';

jest.mock('uuid');

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
                  {
                    type: Constants.AssetType.FILE,
                    contentTypes: [Constants.AssetContentType.OTHER]
                  },
                  {
                    type: Constants.AssetType.FILE,
                    contentTypes: [Constants.AssetContentType.CODE],
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
            category: 'File Type',
            values: [{ key: 'python', label: 'python', value: true }]
          }
        ]);
      });
      it('only returns Content Type filters if there are files', () => {
        expect(
          ProjectUtil.getAssetFilters({
            type: Constants.AssetType.DIRECTORY,
            contentTypes: [Constants.AssetContentType.OTHER],
            children: [
              {
                type: Constants.AssetType.DIRECTORY,
                contentTypes: [Constants.AssetContentType.DATA]
              }
            ]
          })
        ).toStrictEqual([
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
      it('only returns File Type filters if there are files', () => {
        expect(
          ProjectUtil.getAssetFilters({
            type: Constants.AssetType.DIRECTORY,
            children: [
              {
                type: Constants.AssetType.DIRECTORY,
                children: [
                  {
                    type: Constants.AssetType.FILE,
                    contentTypes: [Constants.AssetContentType.OTHER]
                  },
                  // In reality this would be a code file, but we're fabricating it so that
                  // we can confirm it's not returning a filter
                  {
                    type: Constants.AssetType.FILE,
                    contentTypes: [Constants.AssetContentType.OTHER],
                    metadata: [
                      {
                        id: 'StatWrap.PythonHandler'
                      }
                    ]
                  }
                ]
              }
            ]
          })
        ).toStrictEqual([
          {
            category: 'Asset Type',
            values: [
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
                key: Constants.AssetContentType.OTHER,
                label: Constants.AssetContentType.OTHER,
                value: true
              }
            ]
          }
        ]);
      });
    });

    // Tests for getWorkflowFilters may seem a little light.  We need to make sure we have good coverage,
    // but this method makes heavy use of other functions that are otherwise tested.  Because we don't need
    // to exhaustively re-test those used functions, this covers the code/situations specific to this new
    // function.
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
      it('does not return IO filter when asset has no dependency', () => {
        jest.spyOn(WorkflowUtil, 'getAllDependencies').mockReturnValue([]);
        const assets = {
          type: Constants.AssetType.FILE,
          contentTypes: [Constants.AssetContentType.CODE],
          metadata: [
            {
              id: 'StatWrap.PythonHandler'
            }
          ]
        };
        expect(ProjectUtil.getWorkflowFilters(assets)).toStrictEqual([
          {
            category: 'File Type',
            values: [{ key: 'python', label: 'python', value: true }]
          }
        ]);
      });
      it('does not return filters when there are no code files', () => {
        jest.spyOn(WorkflowUtil, 'getAllDependencies').mockReturnValue([
          {
            asset: 'test',
            // Everything else looks like a code file, but we've set this to 'generic' so
            // that means it should never be considered a code file when we are building
            // our filter.
            assetType: 'generic',
            dependencies: [
              {
                type: 'data'
              }
            ]
          }
        ]);
        const assets = {
          type: Constants.AssetType.FILE,
          contentTypes: [Constants.AssetContentType.OTHER],
          metadata: [
            {
              id: 'StatWrap.PythonHandler'
            }
          ]
        };
        expect(ProjectUtil.getWorkflowFilters(assets)).toStrictEqual([]);
      });
      it('returns a filter for a single asset', () => {
        jest.spyOn(WorkflowUtil, 'getAllDependencies').mockReturnValue([
          {
            asset: 'test',
            assetType: 'python',
            dependencies: [
              {
                type: 'data'
              }
            ]
          }
        ]);
        const assets = {
          type: Constants.AssetType.FILE,
          contentTypes: [Constants.AssetContentType.CODE],
          metadata: [
            {
              id: 'StatWrap.PythonHandler'
            }
          ]
        };
        expect(ProjectUtil.getWorkflowFilters(assets)).toStrictEqual([
          {
            category: 'File Type',
            values: [{ key: 'python', label: 'python', value: true }]
          },
          {
            category: 'Inputs and Outputs',
            values: [{ key: 'data', label: 'data', value: true }]
          }
        ]);
      });
      it('returns and sorts filters for multiple assets', () => {
        jest.spyOn(WorkflowUtil, 'getAllDependencies').mockReturnValue([
          {
            asset: 'test',
            assetType: 'r',
            dependencies: [
              {
                id: 'r.csv',
                type: 'data'
              }
            ]
          },
          {
            asset: 'test2',
            assetType: 'python',
            dependencies: [
              {
                id: 'sys',
                module: 'sys',
                import: null,
                alias: null
              }
            ]
          },
          // Make sure we remove duplicates
          {
            asset: 'test2',
            assetType: 'python',
            dependencies: [
              {
                id: 'python.csv',
                type: 'data',
                path: 'python.csv'
              }
            ]
          },
          // Not a real dependency type, but tests sorting
          {
            asset: 'test3',
            assetType: 'r',
            dependencies: [
              {
                id: 'aaa',
                type: 'aaa'
              }
            ]
          }
        ]);
        const assets = {
          type: Constants.AssetType.DIRECTORY,
          children: [
            {
              type: Constants.AssetType.DIRECTORY,
              children: [
                {
                  type: Constants.AssetType.FILE,
                  contentTypes: [Constants.AssetContentType.CODE],
                  metadata: [
                    {
                      id: 'StatWrap.RHandler'
                    }
                  ]
                },
                {
                  type: Constants.AssetType.FILE,
                  contentTypes: [Constants.AssetContentType.CODE],
                  metadata: [
                    {
                      id: 'StatWrap.PythonHandler'
                    }
                  ]
                },
                {
                  type: Constants.AssetType.FILE,
                  contentTypes: [Constants.AssetContentType.CODE],
                  metadata: [
                    {
                      id: 'StatWrap.RHandler'
                    }
                  ]
                }
              ]
            }
          ]
        };
        expect(ProjectUtil.getWorkflowFilters(assets)).toStrictEqual([
          {
            category: 'File Type',
            values: [
              { key: 'python', label: 'python', value: true },
              { key: 'r', label: 'r', value: true }
            ]
          },
          {
            category: 'Inputs and Outputs',
            values: [
              { key: 'aaa', label: 'aaa', value: true },
              { key: 'data', label: 'data', value: true },
              { key: 'dependency', label: 'dependency', value: true }
            ]
          },
          {
            category: 'Dependencies/Libraries',
            values: [{ key: 'sys', label: 'sys', value: true }]
          }
        ]);
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
                  contentTypes: [Constants.AssetContentType.OTHER]
                },
                {
                  uri: 'test1/test2/b',
                  type: Constants.AssetType.FILE,
                  contentTypes: [Constants.AssetContentType.CODE]
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
                  contentTypes: [Constants.AssetContentType.CODE]
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
                  contentTypes: [Constants.AssetContentType.OTHER]
                },
                {
                  uri: 'test1/test2/b',
                  type: Constants.AssetType.FILE,
                  contentTypes: [Constants.AssetContentType.CODE]
                }
              ]
            },
            {
              children: [
                {
                  uri: 'test1/test3/c',
                  type: Constants.AssetType.FILE,
                  contentTypes: [Constants.AssetContentType.CODE]
                }
              ]
            }
          ]
        });
      });
      it('leaves empty directories after non-directory filtering is applied', () => {
        const filters = [
          {
            category: 'Asset Type',
            values: [
              {
                key: Constants.AssetType.DIRECTORY,
                label: Constants.AssetType.DIRECTORY,
                value: true
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
                  contentTypes: [Constants.AssetContentType.OTHER]
                },
                {
                  uri: 'test1/test2/b',
                  type: Constants.AssetType.FILE,
                  contentTypes: [Constants.AssetContentType.CODE]
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
                  contentTypes: [Constants.AssetContentType.CODE]
                }
              ]
            }
          ]
        };
        expect(ProjectUtil.getFilteredAssets(assets, filters)).toStrictEqual({
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
                  contentTypes: [Constants.AssetContentType.OTHER]
                }
              ]
            },
            {
              uri: 'test1/test3',
              type: Constants.AssetType.DIRECTORY,
              children: []
            }
          ]
        });
      });
      it('leaves empty directories when no filtering is needed', () => {
        const filters = [
          {
            category: 'Asset Type',
            values: [
              {
                key: Constants.AssetType.DIRECTORY,
                label: Constants.AssetType.DIRECTORY,
                value: true
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
                value: true
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
                  contentTypes: [Constants.AssetContentType.OTHER]
                },
                {
                  uri: 'test1/test2/b',
                  type: Constants.AssetType.FILE,
                  contentTypes: [Constants.AssetContentType.CODE]
                }
              ]
            },
            {
              uri: 'test1/test3',
              type: Constants.AssetType.DIRECTORY
            }
          ]
        };
        expect(ProjectUtil.getFilteredAssets(assets, filters)).toStrictEqual(assets);
      });
    });
    it('retains directories even with a filtered out content type if directories are shown', () => {
      const filters = [
        {
          category: 'Asset Type',
          values: [
            {
              key: Constants.AssetType.DIRECTORY,
              label: Constants.AssetType.DIRECTORY,
              value: true
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
              key: Constants.AssetContentType.OTHER,
              label: Constants.AssetContentType.OTHER,
              value: false
            }
          ]
        },
        {
          category: 'File Type',
          values: [
            {
              key: 'generic',
              label: 'generic',
              value: false
            }
          ]
        }
      ];
      const assets = {
        uri: 'test1',
        type: Constants.AssetType.DIRECTORY,
        contentTypes: [Constants.AssetContentType.OTHER],
        children: [
          {
            uri: 'test1/test2',
            type: Constants.AssetType.DIRECTORY,
            contentTypes: [Constants.AssetContentType.OTHER],
            children: [
              {
                uri: 'test1/test2/a',
                type: Constants.AssetType.FILE,
                contentTypes: [Constants.AssetContentType.OTHER]
              }
            ]
          },
          {
            uri: 'test1/test3',
            type: Constants.AssetType.DIRECTORY,
            contentTypes: [Constants.AssetContentType.OTHER],
            children: [
              {
                uri: 'test1/test3/c',
                type: Constants.AssetType.FILE,
                contentTypes: [Constants.AssetContentType.CODE],
                metadata: [
                  {
                    id: 'StatWrap.RHandler'
                  }
                ]
              }
            ]
          }
        ]
      };
      expect(ProjectUtil.getFilteredAssets(assets, filters)).toStrictEqual({
        uri: 'test1',
        type: Constants.AssetType.DIRECTORY,
        contentTypes: [Constants.AssetContentType.OTHER],
        children: [
          {
            uri: 'test1/test2',
            type: Constants.AssetType.DIRECTORY,
            contentTypes: [Constants.AssetContentType.OTHER],
            children: []
          },
          {
            uri: 'test1/test3',
            type: Constants.AssetType.DIRECTORY,
            contentTypes: [Constants.AssetContentType.OTHER],
            children: [
              {
                uri: 'test1/test3/c',
                type: Constants.AssetType.FILE,
                contentTypes: [Constants.AssetContentType.CODE],
                metadata: [
                  {
                    id: 'StatWrap.RHandler'
                  }
                ]
              }
            ]
          }
        ]
      });
    });
    it('applies all filters', () => {
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
              key: Constants.AssetContentType.OTHER,
              label: Constants.AssetContentType.OTHER,
              value: false
            }
          ]
        },
        {
          category: 'File Type',
          values: [
            {
              key: 'python',
              label: 'python',
              value: false
            },
            {
              key: 'r',
              label: 'r',
              value: true
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
                contentTypes: [Constants.AssetContentType.OTHER]
              },
              {
                uri: 'test1/test2/b',
                type: Constants.AssetType.FILE,
                contentTypes: [Constants.AssetContentType.CODE],
                metadata: [
                  {
                    id: 'StatWrap.PythonHandler'
                  }
                ]
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
                contentTypes: [Constants.AssetContentType.CODE],
                metadata: [
                  {
                    id: 'StatWrap.PythonHandler'
                  }
                ]
              },
              {
                uri: 'test1/test3/d',
                type: Constants.AssetType.FILE,
                contentTypes: [Constants.AssetContentType.CODE],
                metadata: [
                  {
                    id: 'StatWrap.RHandler'
                  }
                ]
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
                uri: 'test1/test3/d',
                type: Constants.AssetType.FILE,
                contentTypes: [Constants.AssetContentType.CODE],
                metadata: [
                  {
                    id: 'StatWrap.RHandler'
                  }
                ]
              }
            ]
          }
        ]
      });
    });
  });
  describe('isDirectoryFilteredOut', () => {
    it('returns false null/empty filters', () => {
      expect(ProjectUtil.isDirectoryFilteredOut(null)).toBe(false);
      expect(ProjectUtil.isDirectoryFilteredOut(undefined)).toBe(false);
      expect(ProjectUtil.isDirectoryFilteredOut([])).toBe(false);
    });
    it('returns false when there is no Asset Type filter present', () => {
      const filters = [
        {
          category: 'Content Type',
          values: [
            {
              key: Constants.AssetContentType.OTHER,
              label: Constants.AssetContentType.OTHER,
              value: false
            }
          ]
        }
      ];
      expect(ProjectUtil.isDirectoryFilteredOut(filters)).toBe(false);
    });
    it('returns false when there is no directory filter present', () => {
      const filters = [
        {
          category: 'Asset Type',
          values: [
            {
              key: Constants.AssetType.FILE,
              label: Constants.AssetType.FILE,
              value: true
            }
          ]
        }
      ];
      expect(ProjectUtil.isDirectoryFilteredOut(filters)).toBe(false);
    });
    it('returns false when the directory filter is on', () => {
      const filters = [
        {
          category: 'Asset Type',
          values: [
            {
              key: Constants.AssetType.DIRECTORY,
              label: Constants.AssetType.DIRECTORY,
              value: true
            },
            {
              key: Constants.AssetType.FILE,
              label: Constants.AssetType.FILE,
              value: true
            }
          ]
        }
      ];
      expect(ProjectUtil.isDirectoryFilteredOut(filters)).toBe(false);
    });
    it('returns true when the directory filter is off', () => {
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
        }
      ];
      expect(ProjectUtil.isDirectoryFilteredOut(filters)).toBe(true);
    });
  });

  describe('flattenFilteredAssets', () => {
    it('returns null for null/empty asset', () => {
      expect(ProjectUtil.flattenFilteredAssets(null)).toBeNull();
      expect(ProjectUtil.flattenFilteredAssets(undefined)).toBeNull();
    });

    it('returns returns a stub for an empty asset object', () => {
      expect(ProjectUtil.flattenFilteredAssets({})).toStrictEqual({
        uri: 'Filtered List',
        children: []
      });
    });
    it('flattens a single level of descendants', () => {
      const assets = {
        children: [
          {
            uri: 'test1/a',
            type: Constants.AssetType.FILE,
            contentTypes: [Constants.AssetContentType.OTHER]
          },
          {
            uri: 'test1/b',
            type: Constants.AssetType.FILE,
            contentTypes: [Constants.AssetContentType.CODE]
          }
        ]
      };
      expect(ProjectUtil.flattenFilteredAssets(assets)).toStrictEqual({
        uri: 'Filtered List',
        children: [
          {
            uri: 'test1/a',
            type: Constants.AssetType.FILE,
            contentTypes: [Constants.AssetContentType.OTHER]
          },
          {
            uri: 'test1/b',
            type: Constants.AssetType.FILE,
            contentTypes: [Constants.AssetContentType.CODE]
          }
        ]
      });
    });
    it('flattens nested descendants', () => {
      const assets = {
        children: [
          {
            children: [
              {
                uri: 'test1/test2/a',
                type: Constants.AssetType.FILE,
                contentTypes: [Constants.AssetContentType.OTHER]
              },
              {
                uri: 'test1/test2/b',
                type: Constants.AssetType.FILE,
                contentTypes: [Constants.AssetContentType.CODE]
              }
            ]
          },
          {
            children: [
              {
                uri: 'test1/test3/c',
                type: Constants.AssetType.FILE,
                contentTypes: [Constants.AssetContentType.CODE]
              },
              {
                uri: 'test1/test3/d',
                type: Constants.AssetType.FILE,
                contentTypes: [Constants.AssetContentType.CODE]
              }
            ]
          }
        ]
      };
      expect(ProjectUtil.flattenFilteredAssets(assets)).toStrictEqual({
        uri: 'Filtered List',
        children: [
          {
            uri: 'test1/test2/a',
            type: Constants.AssetType.FILE,
            contentTypes: [Constants.AssetContentType.OTHER]
          },
          {
            uri: 'test1/test2/b',
            type: Constants.AssetType.FILE,
            contentTypes: [Constants.AssetContentType.CODE]
          },
          {
            uri: 'test1/test3/c',
            type: Constants.AssetType.FILE,
            contentTypes: [Constants.AssetContentType.CODE]
          },
          {
            uri: 'test1/test3/d',
            type: Constants.AssetType.FILE,
            contentTypes: [Constants.AssetContentType.CODE]
          }
        ]
      });
    });
  });

  describe('validateAssetGroupName', () => {
    it('should not consider a null or undefined name valid', () => {
      expect(ProjectUtil.validateAssetGroupName(null)).toBe(false);
      expect(ProjectUtil.validateAssetGroupName(undefined)).toBe(false);
    });
    it('should not consider valid a name with an empty or whitespace only first component', () => {
      expect(ProjectUtil.validateAssetGroupName('')).toBe(false);
      expect(ProjectUtil.validateAssetGroupName(' ')).toBe(false);
      expect(ProjectUtil.validateAssetGroupName('\t')).toBe(false);
      expect(ProjectUtil.validateAssetGroupName('\n')).toBe(false);
      expect(ProjectUtil.validateAssetGroupName('\r')).toBe(false);
    });
    it('should consider valid names with at least one letter', () => {
      expect(ProjectUtil.validateAssetGroupName('T')).toBe(true);
      expect(ProjectUtil.validateAssetGroupName('Test')).toBe(true);
    });
    it('should consider valid names with at least one letter along with whitespace', () => {
      expect(ProjectUtil.validateAssetGroupName('T ')).toBe(true);
      expect(ProjectUtil.validateAssetGroupName(' T ')).toBe(true);
      expect(ProjectUtil.validateAssetGroupName('\tT')).toBe(true);
      expect(ProjectUtil.validateAssetGroupName('T\r')).toBe(true);
      expect(ProjectUtil.validateAssetGroupName('T\n')).toBe(true);
    });
  });

  describe('_validateProjectAndGroup', () => {
    it('should throw an exception if the project is null or undefined', () => {
      expect(() => ProjectUtil._validateProjectAndGroup(null, {}, false)).toThrow(Error);
      expect(() => ProjectUtil._validateProjectAndGroup(undefined, {}, false)).toThrow(Error);
    });
    it('should throw an exception if the group is null or undefined', () => {
      expect(() => ProjectUtil._validateProjectAndGroup({}, null, false)).toThrow(Error);
      expect(() => ProjectUtil._validateProjectAndGroup({}, undefined, false)).toThrow(Error);
    });
    it('should throw an exception if the group ID is expected', () => {
      expect(() => ProjectUtil._validateProjectAndGroup({}, { name: 'test' }, true)).toThrow(Error);
      expect(() =>
        ProjectUtil._validateProjectAndGroup({}, { id: null, name: 'test' }, true)
      ).toThrow(Error);
      expect(() =>
        ProjectUtil._validateProjectAndGroup({}, { id: undefined, name: 'test' }, true)
      ).toThrow(Error);
      expect(() =>
        ProjectUtil._validateProjectAndGroup({}, { id: '', name: 'test' }, true)
      ).toThrow(Error);
    });
    it('should not throw an exception if the group ID is not expected and is not provided', () => {
      expect(() => ProjectUtil._validateProjectAndGroup({}, { name: 'test' }, false)).not.toThrow(
        Error
      );
      expect(() =>
        ProjectUtil._validateProjectAndGroup({}, { id: null, name: 'test' }, false)
      ).not.toThrow(Error);
      expect(() =>
        ProjectUtil._validateProjectAndGroup({}, { id: undefined, name: 'test' }, false)
      ).not.toThrow(Error);
      expect(() =>
        ProjectUtil._validateProjectAndGroup({}, { id: '', name: 'test' }, false)
      ).not.toThrow(Error);
    });
    it('should not throw an exception if the group ID is expected and is provided', () => {
      expect(() =>
        ProjectUtil._validateProjectAndGroup({}, { id: 'a-b-c-d-e', name: 'test' }, true)
      ).not.toThrow(Error);
      // We are taking IDs exactly as they come, so whitespace is 'valid' (for now)
      expect(() =>
        ProjectUtil._validateProjectAndGroup({}, { id: '  ', name: 'test' }, true)
      ).not.toThrow(Error);
    });
  });

  describe('upsertAssetGroup', () => {
    // We are not doing tests for parameter checks because they are covered by the tests
    // for _validateProjectAndGroup

    it('should throw an exception if the group name is invalid', () => {
      expect(() => ProjectUtil.upsertAssetGroup({}, '')).toThrow(Error);
    });
    it('should initialize the asset group collection in an empty project object', () => {
      const project = {};
      expect(
        ProjectUtil.upsertAssetGroup(project, {
          id: '1-2-3',
          name: 'Test'
        })
      ).not.toBeNull();
      expect(project.assetGroups).not.toBeNull();
    });
    it('should add a new person when the id is provided', () => {
      const project = {};
      const assetGroup = {
        id: '1-2-3',
        name: 'Test'
      };
      expect(ProjectUtil.upsertAssetGroup(project, assetGroup)).not.toBeNull();
      expect(project.assetGroups[0].id).toEqual('1-2-3');
      expect(project.assetGroups[0].name).toEqual(assetGroup.name);
    });
    it('should add a new group when the id differs in case', () => {
      const project = {
        assetGroups: [
          {
            id: 'a-b-c',
            name: 'Test'
          }
        ]
      };
      expect(
        ProjectUtil.upsertAssetGroup(project, {
          id: 'A-b-c',
          name: 'Other'
        })
      ).not.toBeNull();
      expect(project.assetGroups[1].id).toEqual('A-b-c');
    });
    it('should add a new group when the id is empty', () => {
      // Note: uuid mocking fixed/broke/fixed?  May need to remove this line
      // if it breaks again.
      uuid.mockImplementationOnce(() => {
        return '1-2-3';
      });
      const project = {};
      expect(
        ProjectUtil.upsertAssetGroup(project, {
          name: 'Test'
        })
      ).not.toBeNull();
      expect(project.assetGroups[0]).toEqual({
        id: '1-2-3',
        name: 'Test'
      });
    });
    it('should update an existing person', () => {
      const project = {
        assetGroups: [
          {
            id: '1-2-3',
            name: 'Test',
            details: 'Testing',
            assets: [{ uri: 'test' }]
          }
        ]
      };
      const updatedGroup = {
        id: '1-2-3',
        name: 'Updated',
        details: 'Updated details',
        assets: []
      };
      expect(ProjectUtil.upsertAssetGroup(project, updatedGroup)).not.toBeNull();
      expect(project.assetGroups[0]).toEqual(updatedGroup);
    });
    it('should fail to update an existing person if the update person is invalid', () => {
      const project = {
        assetGroups: [
          {
            id: '1-2-3',
            name: 'Test',
            details: 'Testing',
            assets: [{ uri: 'test' }]
          }
        ]
      };
      const updatedGroup = {
        id: '1-2-3'
      };
      expect(() => ProjectUtil.upsertAssetGroup(project, updatedGroup)).toThrow(Error);
      expect(project.assetGroups[0]).not.toEqual(updatedGroup);
    });
  });

  describe('removeAssetGroup', () => {
    // We are not doing tests for parameter checks because they are covered by the tests
    // for _validateProjectAndGroup

    it('should handle when there is an undefined assetGroup collection in the project', () => {
      const project = {};
      const assetGroup = {
        id: '1-2-3',
        name: 'Test'
      };
      ProjectUtil.removeAssetGroup(project, assetGroup);
      expect(project.assetGroups).toEqual(undefined);
    });
    it('should handle when there is a null assetGroup collection in the project', () => {
      const project = { assetGroups: null };
      const assetGroup = {
        id: '1-2-3',
        name: 'Test'
      };
      ProjectUtil.removeAssetGroup(project, assetGroup);
      expect(project.assetGroups).toBeNull();
    });
    it('should remove an existing asset group', () => {
      const project = { assetGroups: [{ id: '1-2-3', name: 'Test' }] };
      const assetGroup = {
        id: '1-2-3',
        name: 'Test'
      };
      ProjectUtil.removeAssetGroup(project, assetGroup);
      expect(project.assetGroups.length).toEqual(0);
    });
    it('should not remove anything if there is no matching asset group ID', () => {
      const project = { assetGroups: [{ id: '1-2-3', name: 'Test' }] };
      const assetGroup = {
        id: '1-2-4',
        name: 'Test'
      };
      ProjectUtil.removeAssetGroup(project, assetGroup);
      expect(project.assetGroups.length).toEqual(1);
    });
  });

  describe('getProjectUpdates', () => {
    it('should return firstView when the last viewed timestamp is not provided', () => {
      expect(ProjectUtil.getProjectUpdates(null, []).firstView).toEqual(true);
      expect(ProjectUtil.getProjectUpdates(undefined, []).firstView).toEqual(true);
      expect(ProjectUtil.getProjectUpdates('', []).firstView).toEqual(true);
    });

    it('should return upToDate when the log is empty', () => {
      expect(ProjectUtil.getProjectUpdates('2020-12-22T23:55:40.164Z', null).upToDate).toEqual(
        true
      );
      expect(ProjectUtil.getProjectUpdates('2020-12-22T23:55:40.164Z', undefined).upToDate).toEqual(
        true
      );
      expect(ProjectUtil.getProjectUpdates('2020-12-22T23:55:40.164Z', []).upToDate).toEqual(true);
    });

    it('should return upToDate when the last viewed timestamp is after all log entries', () => {
      expect(
        ProjectUtil.getProjectUpdates('2022-12-22T23:55:40.164Z', [
          {
            timestamp: '2021-12-22T23:55:40.164Z',
            user: 'test'
          },
          {
            timestamp: '2020-12-22T23:55:40.164Z',
            user: 'test'
          }
        ]).upToDate
      ).toEqual(true);
    });

    it('should track the recent log entries and multiple distinct users', () => {
      const updates = ProjectUtil.getProjectUpdates('2022-12-21T13:55:40.164Z', [
        {
          timestamp: '2022-12-23T23:55:40.164Z',
          user: 'test'
        },
        {
          timestamp: '2022-12-22T23:55:40.164Z',
          user: 'test2'
        },
        {
          timestamp: '2022-12-21T23:55:40.164Z',
          user: 'test'
        },
        {
          timestamp: '2022-12-20T23:55:40.164Z',
          user: 'test2'
        }
      ]);
      expect(updates.distinctUsers).toEqual(2);
      expect(updates.log.length).toEqual(3);
    });

    it('should count missing/null users as one distinct', () => {
      const updates = ProjectUtil.getProjectUpdates('2020-12-21T13:55:40.164Z', [
        {
          timestamp: '2022-12-23T23:55:40.164Z'
        },
        {
          timestamp: '2022-12-21T23:55:40.164Z',
          user: null
        },
        {
          timestamp: '2022-12-20T23:55:40.164Z',
          user: undefined
        },
        {
          timestamp: '2022-12-20T23:55:40.164Z',
          user: ''
        }
      ]);
      expect(updates.distinctUsers).toEqual(1);
      expect(updates.log.length).toEqual(4);
    });
  });
});
