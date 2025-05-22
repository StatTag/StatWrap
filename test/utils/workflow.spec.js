import WorkflowUtil from '../../app/utils/workflow';
import Constants from '../../app/constants/constants';

describe('utils', () => {
  describe('WorkwlowUtil', () => {
    describe('getAllDependencies', () => {
      it('should handle empty/invalid inputs', () => {
        expect(WorkflowUtil.getAllDependencies(null).length).toEqual(0);
        expect(WorkflowUtil.getAllDependencies(undefined).length).toEqual(0);
      });
      it('should build the list of assets even when there are no dependencies', () => {
        const asset = {
          uri: '/test/1',
          children: [
            {
              uri: '/test/1/1',
              children: [
                {
                  uri: '/test/1/1/1',
                },
              ],
            },
            {
              uri: '/test/1/2',
              children: [],
            },
          ],
        };
        // Even though there are no actual dependencies, we will get back all of
        // the assets and children
        expect(WorkflowUtil.getAllDependencies(asset).length).toEqual(4);
      });
      it('should build the list of assets and dependencies', () => {
        const asset = {
          uri: '/test/1',
          children: [
            {
              uri: '/test/1/1',
              children: [
                {
                  uri: '/test/1/1/1',
                  metadata: [
                    {
                      id: 'StatWrap.PythonHandler',
                      libraries: [
                        {
                          id: 'sys',
                          module: 'sys',
                          import: null,
                          alias: null,
                        },
                      ],
                    },
                  ],
                },
              ],
            },
            {
              uri: '/test/1/2',
              metadata: [
                {
                  id: 'StatWrap.PythonHandler',
                  libraries: [
                    {
                      id: 'sys',
                      module: 'sys',
                      import: null,
                      alias: null,
                    },
                  ],
                },
              ],
            },
          ],
        };
        const dependencies = WorkflowUtil.getAllDependencies(asset);
        // We get back 4 assets, and two of them should have dependencies
        expect(dependencies.length).toEqual(4);
        expect(dependencies[0].dependencies.length).toEqual(0);
        expect(dependencies[1].dependencies.length).toEqual(0);
        expect(dependencies[2].dependencies.length).toEqual(1);
        expect(dependencies[3].dependencies.length).toEqual(1);
      });
    });

    describe('getAllDependenciesAsGraph', () => {
      it('should handle empty/invalid inputs', () => {
        expect(WorkflowUtil.getAllDependenciesAsGraph(null)).toEqual({ nodes: [], links: [] });
        expect(WorkflowUtil.getAllDependenciesAsGraph(undefined)).toEqual({ nodes: [], links: [] });
      });
      it('should build an empty graph when there are no dependencies', () => {
        const asset = {
          uri: '/test/1',
          children: [
            {
              uri: '/test/1/1',
              children: [
                {
                  uri: '/test/1/1/1',
                },
              ],
            },
            {
              uri: '/test/1/2',
              children: [],
            },
          ],
        };
        const graph = WorkflowUtil.getAllDependenciesAsGraph(asset);
        expect(graph).toEqual({ nodes: [], links: [] });
      });
      it('should build the dependency graph including multiple code types', () => {
        const asset = {
          uri: '/test/1',
          children: [
            {
              uri: '/test/1/1',
              children: [
                {
                  uri: '/test/1/1/1',
                  metadata: [
                    {
                      id: 'StatWrap.RHandler',
                      libraries: [
                        {
                          id: 'dplyr',
                          package: 'dplyr',
                        },
                      ],
                    },
                  ],
                },
              ],
            },
            {
              uri: '/test/1/2',
              metadata: [
                {
                  id: 'StatWrap.PythonHandler',
                  libraries: [
                    {
                      id: 'sys',
                      module: 'sys',
                      import: null,
                      alias: null,
                    },
                  ],
                },
              ],
            },
          ],
        };
        const graph = WorkflowUtil.getAllDependenciesAsGraph(asset);
        expect(graph).toEqual({
          nodes: [
            { id: '1/1', assetType: 'r' },
            { id: 'dplyr', assetType: 'dependency', direction: 'in' },
            { id: '2', assetType: 'python' },
            { id: 'sys', assetType: 'dependency', direction: 'in' },
          ],
          links: [
            { source: 'dplyr', target: '1/1' },
            { source: 'sys', target: '2' },
          ],
        });
      });
      it('should build the dependency graph and only include unique entries', () => {
        const asset = {
          uri: '/test/1',
          children: [
            {
              uri: '/test/1/1',
              children: [
                {
                  uri: '/test/1/1/1',
                  metadata: [
                    {
                      id: 'StatWrap.PythonHandler',
                      libraries: [
                        {
                          id: 'sys',
                          module: 'sys',
                          import: null,
                          alias: null,
                        },
                      ],
                    },
                  ],
                },
              ],
            },
            {
              uri: '/test/1/2',
              metadata: [
                {
                  id: 'StatWrap.PythonHandler',
                  libraries: [
                    {
                      id: 'sys',
                      module: 'sys',
                      import: null,
                      alias: null,
                    },
                    // Scenario if a Python file includes the same module twice
                    {
                      id: 'sys',
                      module: 'sys',
                      import: null,
                      alias: null,
                    },
                  ],
                },
              ],
            },
          ],
        };
        const graph = WorkflowUtil.getAllDependenciesAsGraph(asset);
        expect(graph).toEqual({
          nodes: [
            { id: '1/1', assetType: 'python' },
            { id: 'sys', assetType: 'dependency', direction: 'in' },
            { id: '2', assetType: 'python' },
          ],
          links: [
            { source: 'sys', target: '1/1' },
            { source: 'sys', target: '2' },
          ],
        });
      });
      it('should filter out items from the graph', () => {
        const asset = {
          uri: '/test/1',
          children: [
            {
              uri: '/test/1/1',
              children: [
                {
                  uri: '/test/1/1/1',
                  metadata: [
                    {
                      id: 'StatWrap.RHandler',
                      libraries: [
                        {
                          id: 'dplyr',
                          package: 'dplyr',
                        },
                      ],
                      inputs: [
                        {
                          id: 'r.csv',
                          type: Constants.DependencyType.DATA,
                          path: 'r.csv',
                        },
                      ],
                    },
                  ],
                },
              ],
            },
            {
              uri: '/test/1/2',
              metadata: [
                {
                  id: 'StatWrap.PythonHandler',
                  libraries: [
                    {
                      id: 'sys',
                      module: 'sys',
                      import: null,
                      alias: null,
                    },
                    {
                      id: 'pandas',
                      module: 'pandas',
                      import: null,
                      alias: null,
                    },
                  ],
                  inputs: [
                    {
                      id: 'tmp',
                      type: Constants.DependencyType.DATA,
                      path: 'python.csv',
                    },
                  ],
                },
              ],
            },
          ],
        };
        const filters = [
          {
            category: 'File Type',
            values: [
              {
                key: 'python',
                label: 'python',
                value: false,
              },
              {
                key: 'r',
                label: 'r',
                value: true,
              },
            ],
          },
          {
            category: 'Inputs and Outputs',
            values: [
              {
                key: 'dependency',
                label: 'dependency',
                value: false,
              },
              {
                key: 'data',
                label: 'data',
                value: true,
              },
            ],
          },
          {
            category: 'Dependencies/Libraries',
            values: [
              {
                key: 'pandas',
                label: 'pandas',
                value: true,
              },
              {
                key: 'sys',
                label: 'sys',
                value: true,
              },
            ],
          },
        ];
        const graph = WorkflowUtil.getAllDependenciesAsGraph(asset, filters);
        expect(graph).toEqual({
          nodes: [
            { id: '1/1', assetType: 'r' },
            { id: 'r.csv', assetType: 'data', direction: 'in' },
          ],
          links: [{ source: 'r.csv', target: '1/1' }],
        });
      });
    });
    it('should filter out specific libraries from the graph', () => {
      const asset = {
        uri: '/test/1',
        children: [
          {
            uri: '/test/1/1',
            children: [
              {
                uri: '/test/1/1/1',
                metadata: [
                  {
                    id: 'StatWrap.RHandler',
                    libraries: [
                      {
                        id: 'dplyr',
                        package: 'dplyr',
                      },
                    ],
                    inputs: [
                      {
                        id: 'r.csv',
                        type: Constants.DependencyType.DATA,
                        path: 'r.csv',
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            uri: '/test/1/2',
            metadata: [
              {
                id: 'StatWrap.PythonHandler',
                libraries: [
                  {
                    id: 'sys',
                    module: 'sys',
                    import: null,
                    alias: null,
                  },
                  {
                    id: 'pandas',
                    module: 'pandas',
                    import: null,
                    alias: null,
                  },
                ],
                inputs: [
                  {
                    id: 'tmp',
                    type: Constants.DependencyType.DATA,
                    path: 'python.csv',
                  },
                ],
              },
            ],
          },
        ],
      };
      const filters = [
        {
          category: 'File Type',
          values: [
            {
              key: 'python',
              label: 'python',
              value: true,
            },
            {
              key: 'r',
              label: 'r',
              value: false,
            },
          ],
        },
        {
          category: 'Inputs and Outputs',
          values: [
            {
              key: 'dependency',
              label: 'dependency',
              value: true,
            },
            {
              key: 'data',
              label: 'data',
              value: false,
            },
          ],
        },
        {
          category: 'Dependencies/Libraries',
          values: [
            {
              key: 'pandas',
              label: 'pandas',
              value: false,
            },
            {
              key: 'sys',
              label: 'sys',
              value: true,
            },
          ],
        },
      ];
      const graph = WorkflowUtil.getAllDependenciesAsGraph(asset, filters);
      expect(graph).toEqual({
        nodes: [
          { id: '2', assetType: 'python' },
          { id: 'sys', assetType: 'dependency', direction: 'in' },
        ],
        links: [{ source: 'sys', target: '2' }],
      });
    });

    describe('getAllDependenciesAsEChartGraph', () => {
      it('should handle empty/invalid inputs', () => {
        expect(WorkflowUtil.getAllDependenciesAsEChartGraph(null)).toEqual({
          nodes: [],
          links: [],
        });
        expect(WorkflowUtil.getAllDependenciesAsEChartGraph(undefined)).toEqual({
          nodes: [],
          links: [],
        });
      });
      it('should translate the graph to the EChart data model', () => {
        const asset = {
          uri: '/test/1',
          children: [
            {
              uri: '/test/1/2',
              metadata: [
                {
                  id: 'StatWrap.PythonHandler',
                  libraries: [
                    {
                      id: 'sys',
                      module: 'sys',
                      import: null,
                      alias: null,
                    },
                    {
                      id: 'pandas',
                      module: 'pandas',
                      import: null,
                      alias: null,
                    },
                  ],
                  inputs: [
                    {
                      id: 'tmp',
                      type: Constants.DependencyType.DATA,
                      path: 'python.csv',
                    },
                  ],
                },
              ],
            },
          ],
        };
        const graph = WorkflowUtil.getAllDependenciesAsEChartGraph(asset);
        expect(graph).toEqual({
          nodes: [
            {
              id: '2',
              fullName: '2',
              name: '2',
              value: 'python',
            },
            {
              id: 'sys',
              fullName: 'sys',
              name: 'sys',
              value: 'dependency',
              direction: 'in',
            },
            {
              id: 'pandas',
              fullName: 'pandas',
              name: 'pandas',
              value: 'dependency',
              direction: 'in',
            },
            {
              id: 'tmp',
              fullName: 'tmp',
              name: 'tmp',
              value: 'data',
              direction: 'in',
            },
          ],
          links: [
            {
              source: 'sys',
              target: '2',
            },
            {
              source: 'pandas',
              target: '2',
            },
            {
              source: 'tmp',
              target: '2',
            },
          ],
        });
      });
    });

    describe('getAssetType', () => {
      it('should handle empty/invalid input', () => {
        expect(WorkflowUtil.getAssetType(null)).toEqual('generic');
        expect(WorkflowUtil.getAssetType(undefined)).toEqual('generic');
      });

      it('should return a default value for known types', () => {
        expect(WorkflowUtil.getAssetType({ metadata: [{ id: 'StatWrap.PythonHandler' }] })).toEqual(
          'python',
        );
      });

      it('should return a default value for unkown types', () => {
        expect(WorkflowUtil.getAssetType({})).toEqual('generic');
      });
    });

    describe('getAllDependenciesAsTree', () => {
      it('should handle empty/invalid input', () => {
        expect(WorkflowUtil.getAllDependenciesAsTree(null)).toBeNull();
        expect(WorkflowUtil.getAllDependenciesAsTree(undefined)).toBeNull();
      });

      it.onMac('should generate a structure even if there are no children', () => {
        expect(WorkflowUtil.getAllDependenciesAsTree({ uri: '/test/1' })).toEqual({
          name: '1',
          children: null,
          attributes: {
            assetType: 'generic',
          },
        });
      });
      it.onWindows('should generate a structure even if there are no children', () => {
        expect(WorkflowUtil.getAllDependenciesAsTree({ uri: 'C:\\test\\1' })).toEqual({
          name: '1',
          children: null,
          attributes: {
            assetType: 'generic',
          },
        });
      });

      it.onMac('should generate a structure with children', () => {
        const asset = {
          uri: '/test/1',
          children: [
            {
              uri: '/test/1/1',
              children: [
                {
                  uri: '/test/1/1/1',
                  metadata: [
                    {
                      id: 'StatWrap.PythonHandler',
                      libraries: [
                        {
                          id: 'sys',
                          module: 'sys',
                          import: null,
                          alias: null,
                        },
                      ],
                    },
                  ],
                },
              ],
            },
            {
              uri: '/test/1/2',
              metadata: [
                {
                  id: 'StatWrap.PythonHandler',
                  libraries: [
                    {
                      id: 'sys',
                      module: 'sys',
                      import: null,
                      alias: null,
                    },
                    // Scenario if a Python file includes the same module twice
                    {
                      id: 'sys',
                      module: 'sys',
                      import: null,
                      alias: null,
                    },
                  ],
                },
              ],
            },
          ],
        };
        expect(WorkflowUtil.getAllDependenciesAsTree(asset)).toEqual({
          name: '1',
          children: [
            {
              name: '1',
              attributes: {
                assetType: 'generic',
              },
              children: [
                {
                  name: '1',
                  attributes: {
                    assetType: 'python',
                  },
                  children: [
                    {
                      name: 'sys',
                      attributes: {
                        assetType: 'dependency',
                      },
                    },
                  ],
                },
              ],
            },
            {
              name: '2',
              children: [
                {
                  name: 'sys',
                  attributes: {
                    assetType: 'dependency',
                  },
                },
              ],
              attributes: {
                assetType: 'python',
              },
            },
          ],
          attributes: {
            assetType: 'generic',
          },
        });
      });

      it.onWindows('should generate a structure with children', () => {
        const asset = {
          uri: 'C:\\test\\1',
          children: [
            {
              uri: 'C:\\test\\1\\1',
              children: [
                {
                  uri: 'C:\\test\\1\\1\\1',
                  metadata: [
                    {
                      id: 'StatWrap.PythonHandler',
                      libraries: [
                        {
                          id: 'sys',
                          module: 'sys',
                          import: null,
                          alias: null,
                        },
                      ],
                    },
                  ],
                },
              ],
            },
            {
              uri: 'C:\\test\\1\\2',
              metadata: [
                {
                  id: 'StatWrap.PythonHandler',
                  libraries: [
                    {
                      id: 'sys',
                      module: 'sys',
                      import: null,
                      alias: null,
                    },
                    // Scenario if a Python file includes the same module twice
                    {
                      id: 'sys',
                      module: 'sys',
                      import: null,
                      alias: null,
                    },
                  ],
                },
              ],
            },
          ],
        };
        expect(WorkflowUtil.getAllDependenciesAsTree(asset)).toEqual({
          name: '1',
          children: [
            {
              name: '1',
              attributes: {
                assetType: 'generic',
              },
              children: [
                {
                  name: '1',
                  attributes: {
                    assetType: 'python',
                  },
                  children: [
                    {
                      name: 'sys',
                      attributes: {
                        assetType: 'dependency',
                      },
                    },
                  ],
                },
              ],
            },
            {
              name: '2',
              children: [
                {
                  name: 'sys',
                  attributes: {
                    assetType: 'dependency',
                  },
                },
              ],
              attributes: {
                assetType: 'python',
              },
            },
          ],
          attributes: {
            assetType: 'generic',
          },
        });
      });
    });

    describe('getDependencyName', () => {
      it('should handle empty/invalid input', () => {
        expect(WorkflowUtil.getDependencyName(null)).toEqual('(unknown)');
        expect(WorkflowUtil.getDependencyName(undefined)).toEqual('(unknown)');
        expect(WorkflowUtil.getDependencyName('')).toEqual('(unknown)');
        expect(WorkflowUtil.getDependencyName('  ')).toEqual('(unknown)');
      });

      it('displays the provided name', () => {
        expect(WorkflowUtil.getDependencyName('dplyr')).toEqual('dplyr');
      });

      it('does not trim whitespace', () => {
        expect(WorkflowUtil.getDependencyName(' dplyr ')).toEqual(' dplyr ');
      });

      it('does not truncate long names', () => {
        expect(WorkflowUtil.getDependencyName('R:\\extra\\long\\path\\name\\to\\a\\file\\somewhere.txt')).toEqual('R:\\extra\\long\\path\\name\\to\\a\\file\\somewhere.txt');
      });
    });

    describe('getShortDependencyName', () => {
      it('should handle empty/invalid input', () => {
        expect(WorkflowUtil.getShortDependencyName(null)).toEqual(null);
        expect(WorkflowUtil.getShortDependencyName(undefined)).toEqual(undefined);
        expect(WorkflowUtil.getShortDependencyName('')).toEqual('');
      });
      it('should handle short names without modification', () => {
        expect(WorkflowUtil.getShortDependencyName('test')).toEqual('test');
        const maxLengthLabel = 'a'.repeat(Constants.MAX_GRAPH_LABEL_LENGTH);
        expect(WorkflowUtil.getShortDependencyName(maxLengthLabel)).toEqual(maxLengthLabel);
      });
      it('should shorten long names just over the max limit', () => {
        const maxLengthLabel = `${'a'.repeat(Constants.MAX_GRAPH_LABEL_LENGTH / 2)}...${'a'.repeat(Constants.MAX_GRAPH_LABEL_LENGTH / 2)}`;
        const longLabel = 'a'.repeat(Constants.MAX_GRAPH_LABEL_LENGTH + 1);
        expect(WorkflowUtil.getShortDependencyName(longLabel)).toEqual(`${maxLengthLabel}`);
      });
      it('should shorten a long string appropriately', () => {
        expect(
          WorkflowUtil.getShortDependencyName(
            'Z:\\Test\\Directory for data\\More folder\\Other location\\file.txt',
          ),
        ).toEqual(`Z:\\Test\\Directo...cation\\file.txt`);
      });
    });

    describe('filterArchivedAssets', () => {
      it('should handle empty/invalid input', () => {
        expect(WorkflowUtil.filterArchivedAssets(null)).toBeNull();
        expect(WorkflowUtil.filterArchivedAssets(undefined)).toBeNull();
      });

      it('should return a single asset', () => {
        expect(WorkflowUtil.filterArchivedAssets({ uri: '/test/1' })).toEqual({ uri: '/test/1' });
      });

      it('should return null for a single archived asset', () => {
        expect(WorkflowUtil.filterArchivedAssets({
          uri: '/test/1',
          attributes: { archived: true }
         })).toBeNull();
      });

      it('should filter out a single descendant that is archived but leave the rest', () => {
        const asset = {
          uri: '/test/1',
          children: [
            {
              uri: '/test/1/2',
              attributes: {},
              children: [
                {
                  uri: '/test/1/2/3',
                  attributes: {archived: true}
                },
                {
                  uri: '/test/1/2/4',
                  attributes: {archived: false}
                }
              ]
            },
          ],
        };

        expect(WorkflowUtil.filterArchivedAssets(asset)).toEqual(
          {
            uri: '/test/1',
            children: [
              {
                uri: '/test/1/2',
                attributes: {},
                children: [
                  {
                    uri: '/test/1/2/4',
                    attributes: {archived: false}
                  }
                ]
              },
            ],
          }
        );
      });

      it('should filter out all descendants by removing an archived folder', () => {
        const asset = {
          uri: '/test/1',
          children: [
            {
              uri: '/test/1/2',
              attributes: {archived: true},
              children: [
                {
                  uri: '/test/1/2/3',
                  attributes: {archived: false}
                },
                {
                  uri: '/test/1/2/4',
                  attributes: {archived: false}
                }
              ]
            },
          ],
        };

        expect(WorkflowUtil.filterArchivedAssets(asset)).toEqual(
          {
            uri: '/test/1',
            children: []
          }
        );
      });
    });
  });
});
