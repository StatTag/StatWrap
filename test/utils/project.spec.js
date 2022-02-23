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
      it('only returns Content Type filters if there are files', () => {
        expect(
          ProjectUtil.getAssetFilters({
            type: Constants.AssetType.DIRECTORY,
            contentType: Constants.AssetContentType.OTHER,
            children: [
              {
                type: Constants.AssetType.DIRECTORY,
                contentType: Constants.AssetContentType.data
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
      it('only returns Code File Type filters if there are code files', () => {
        expect(
          ProjectUtil.getAssetFilters({
            type: Constants.AssetType.DIRECTORY,
            children: [
              {
                type: Constants.AssetType.DIRECTORY,
                children: [
                  { type: Constants.AssetType.FILE, contentType: Constants.AssetContentType.OTHER },
                  // In reality this would be a code file, but we're fabricating it so that
                  // we can confirm it's not returning a filter
                  {
                    type: Constants.AssetType.FILE,
                    contentType: Constants.AssetContentType.OTHER,
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
          category: 'Code File Type',
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
        contentType: Constants.AssetContentType.OTHER,
        children: [
          {
            uri: 'test1/test2',
            type: Constants.AssetType.DIRECTORY,
            contentType: Constants.AssetContentType.OTHER,
            children: [
              {
                uri: 'test1/test2/a',
                type: Constants.AssetType.FILE,
                contentType: Constants.AssetContentType.OTHER
              }
            ]
          },
          {
            uri: 'test1/test3',
            type: Constants.AssetType.DIRECTORY,
            contentType: Constants.AssetContentType.OTHER,
            children: [
              {
                uri: 'test1/test3/c',
                type: Constants.AssetType.FILE,
                contentType: Constants.AssetContentType.CODE,
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
        contentType: Constants.AssetContentType.OTHER,
        children: [
          {
            uri: 'test1/test2',
            type: Constants.AssetType.DIRECTORY,
            contentType: Constants.AssetContentType.OTHER,
            children: []
          },
          {
            uri: 'test1/test3',
            type: Constants.AssetType.DIRECTORY,
            contentType: Constants.AssetContentType.OTHER,
            children: [
              {
                uri: 'test1/test3/c',
                type: Constants.AssetType.FILE,
                contentType: Constants.AssetContentType.CODE,
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
          category: 'Code File Type',
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
                contentType: Constants.AssetContentType.OTHER
              },
              {
                uri: 'test1/test2/b',
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
          {
            uri: 'test1/test3',
            type: Constants.AssetType.DIRECTORY,
            children: [
              {
                uri: 'test1/test3/c',
                type: Constants.AssetType.FILE,
                contentType: Constants.AssetContentType.CODE,
                metadata: [
                  {
                    id: 'StatWrap.PythonHandler'
                  }
                ]
              },
              {
                uri: 'test1/test3/d',
                type: Constants.AssetType.FILE,
                contentType: Constants.AssetContentType.CODE,
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
                contentType: Constants.AssetContentType.CODE,
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
    it('only filters out Code File Type for code files', () => {
      const filters = [
        {
          category: 'Code File Type',
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
        children: [
          {
            uri: 'test1/a',
            type: Constants.AssetType.FILE,
            contentType: Constants.AssetContentType.OTHER
          }
        ]
      };
      expect(ProjectUtil.getFilteredAssets(assets, filters)).toStrictEqual(assets);
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
            contentType: Constants.AssetContentType.OTHER
          },
          {
            uri: 'test1/b',
            type: Constants.AssetType.FILE,
            contentType: Constants.AssetContentType.CODE
          }
        ]
      };
      expect(ProjectUtil.flattenFilteredAssets(assets)).toStrictEqual({
        uri: 'Filtered List',
        children: [
          {
            uri: 'test1/a',
            type: Constants.AssetType.FILE,
            contentType: Constants.AssetContentType.OTHER
          },
          {
            uri: 'test1/b',
            type: Constants.AssetType.FILE,
            contentType: Constants.AssetContentType.CODE
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
              },
              {
                uri: 'test1/test3/d',
                type: Constants.AssetType.FILE,
                contentType: Constants.AssetContentType.CODE
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
            contentType: Constants.AssetContentType.OTHER
          },
          {
            uri: 'test1/test2/b',
            type: Constants.AssetType.FILE,
            contentType: Constants.AssetContentType.CODE
          },
          {
            uri: 'test1/test3/c',
            type: Constants.AssetType.FILE,
            contentType: Constants.AssetContentType.CODE
          },
          {
            uri: 'test1/test3/d',
            type: Constants.AssetType.FILE,
            contentType: Constants.AssetContentType.CODE
          }
        ]
      });
    });
  });
});
