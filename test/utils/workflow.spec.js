import WorkflowUtil from '../../app/utils/workflow';

describe('services', () => {
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
                  uri: '/test/1/1/1'
                }
              ]
            },
            {
              uri: '/test/1/2',
              children: []
            }
          ]
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
                          alias: null
                        }
                      ]
                    }
                  ]
                }
              ]
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
                      alias: null
                    }
                  ]
                }
              ]
            }
          ]
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
                  uri: '/test/1/1/1'
                }
              ]
            },
            {
              uri: '/test/1/2',
              children: []
            }
          ]
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
                          package: 'dplyr'
                        }
                      ]
                    }
                  ]
                }
              ]
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
                      alias: null
                    }
                  ]
                }
              ]
            }
          ]
        };
        const graph = WorkflowUtil.getAllDependenciesAsGraph(asset);
        expect(graph).toEqual({
          nodes: [
            { id: '/test/1/1/1', assetType: 'r' },
            { id: 'dplyr', assetType: 'dependency' },
            { id: '/test/1/2', assetType: 'python' },
            { id: 'sys', assetType: 'dependency' }
          ],
          links: [
            { source: '/test/1/1/1', target: 'dplyr' },
            { source: '/test/1/2', target: 'sys' }
          ]
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
                          alias: null
                        }
                      ]
                    }
                  ]
                }
              ]
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
                      alias: null
                    },
                    // Scenario if a Python file includes the same module twice
                    {
                      id: 'sys',
                      module: 'sys',
                      import: null,
                      alias: null
                    }
                  ]
                }
              ]
            }
          ]
        };
        const graph = WorkflowUtil.getAllDependenciesAsGraph(asset);
        expect(graph).toEqual({
          nodes: [
            { id: '/test/1/1/1', assetType: 'python' },
            { id: 'sys', assetType: 'dependency' },
            { id: '/test/1/2', assetType: 'python' }
          ],
          links: [
            { source: '/test/1/1/1', target: 'sys' },
            { source: '/test/1/2', target: 'sys' }
          ]
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
          'python'
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
            assetType: 'generic'
          }
        });
      });
      it.onWindows('should generate a structure even if there are no children', () => {
        expect(WorkflowUtil.getAllDependenciesAsTree({ uri: 'C:\\test\\1' })).toEqual({
          name: '1',
          children: null,
          attributes: {
            assetType: 'generic'
          }
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
                          alias: null
                        }
                      ]
                    }
                  ]
                }
              ]
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
                      alias: null
                    },
                    // Scenario if a Python file includes the same module twice
                    {
                      id: 'sys',
                      module: 'sys',
                      import: null,
                      alias: null
                    }
                  ]
                }
              ]
            }
          ]
        };
        expect(WorkflowUtil.getAllDependenciesAsTree(asset)).toEqual({
          name: '1',
          children: [
            {
              name: '1',
              attributes: {
                assetType: 'generic'
              },
              children: [
                {
                  name: '1',
                  attributes: {
                    assetType: 'python'
                  },
                  children: [
                    {
                      name: 'sys',
                      attributes: {
                        assetType: 'dependency'
                      }
                    }
                  ]
                }
              ]
            },
            {
              name: '2',
              children: [
                {
                  name: 'sys',
                  attributes: {
                    assetType: 'dependency'
                  }
                }
              ],
              attributes: {
                assetType: 'python'
              }
            }
          ],
          attributes: {
            assetType: 'generic'
          }
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
                          alias: null
                        }
                      ]
                    }
                  ]
                }
              ]
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
                      alias: null
                    },
                    // Scenario if a Python file includes the same module twice
                    {
                      id: 'sys',
                      module: 'sys',
                      import: null,
                      alias: null
                    }
                  ]
                }
              ]
            }
          ]
        };
        expect(WorkflowUtil.getAllDependenciesAsTree(asset)).toEqual({
          name: '1',
          children: [
            {
              name: '1',
              attributes: {
                assetType: 'generic'
              },
              children: [
                {
                  name: '1',
                  attributes: {
                    assetType: 'python'
                  },
                  children: [
                    {
                      name: 'sys',
                      attributes: {
                        assetType: 'dependency'
                      }
                    }
                  ]
                }
              ]
            },
            {
              name: '2',
              children: [
                {
                  name: 'sys',
                  attributes: {
                    assetType: 'dependency'
                  }
                }
              ],
              attributes: {
                assetType: 'python'
              }
            }
          ],
          attributes: {
            assetType: 'generic'
          }
        });
      });
    });
  });
});
