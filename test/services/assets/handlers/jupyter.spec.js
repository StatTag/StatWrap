import fs from 'fs';
import JupyterHandler from '../../../../app/services/assets/handlers/jupyter';
import Constants from '../../../../app/constants/constants';

jest.mock('fs');

describe('services', () => {
  describe('JupyterHandler', () => {
    afterEach(() => {
      jest.restoreAllMocks();
      jest.clearAllMocks();
    });

    describe('id', () => {
      it('should return an id that matches the class name plus StatWrap pseudo-namespace', () => {
        expect(new JupyterHandler().id()).toEqual(`StatWrap.${JupyterHandler.name}`);
      });
    });

    describe('includeFile', () => {
      it('should exclude invalid URIs', () => {
        const handler = new JupyterHandler();
        expect(handler.includeFile(null)).toBeFalsy();
        expect(handler.includeFile(undefined)).toBeFalsy();
        expect(handler.includeFile('')).toBeFalsy();
        expect(handler.includeFile('   ')).toBeFalsy();
      });

      it('should exclude non-Jupyter files', () => {
        const handler = new JupyterHandler();
        expect(handler.includeFile('/User/test/Project/python.py')).toBeFalsy();
        expect(handler.includeFile('C:/test/Project/Thumbs.db')).toBeFalsy();
        expect(handler.includeFile(Constants.StatWrapFiles.PROJECT)).toBeFalsy();
      });

      it('should exclude where Jupyter extension exists but is not the last', () => {
        const handler = new JupyterHandler();
        expect(handler.includeFile('/User/test/Project/notebook.ipynb.zip')).toBeFalsy();
        expect(handler.includeFile('C:/test/Project/Processor.ipynb.bak')).toBeFalsy();
        expect(handler.includeFile('.statwrap-project.ipynb.json')).toBeFalsy();
      });

      it('should exclude extension-only URIs', () => {
        const handler = new JupyterHandler();
        expect(handler.includeFile('/User/test/Project/.ipynb')).toBeFalsy();
        expect(handler.includeFile('/User/test/Project/  .ipynb')).toBeFalsy();
        expect(handler.includeFile('.ipynb')).toBeFalsy();
      });

      it('should include allowable extensions (case insensitive)', () => {
        const handler = new JupyterHandler();
        expect(handler.includeFile('/User/test/Project/code/test.ipynb')).toBeTruthy();
        expect(handler.includeFile('/User/test/Project/code/test.IPYNB')).toBeTruthy();
        expect(handler.includeFile('C:/test/Project/test.Ipynb')).toBeTruthy();
      });
    });

    describe('extractCode', () => {
      it('should return empty string for empty input', () => {
        const handler = new JupyterHandler();
        expect(handler.extractCode(null)).toEqual('');
        expect(handler.extractCode(undefined)).toEqual('');
        expect(handler.extractCode('')).toEqual('');
        expect(handler.extractCode('   ')).toEqual('');
      });

      it('should gracefully handle invalid objects', () => {
        const handler = new JupyterHandler();
        expect(handler.extractCode({ invalid: 'object' })).toEqual('');
      });

      it('should return empty string if no cells found', () => {
        const handler = new JupyterHandler();
        const notebook = { cells: [] };
        expect(handler.extractCode(notebook)).toEqual('');
      });

      it('should extract and concatenate code cells only', () => {
        const handler = new JupyterHandler();
        const notebook = {
          cells: [
            {
              cell_type: 'code',
              source: ['import pandas as pd\n', 'df = pd.read_csv("data.csv")\n']
            },
            {
              cell_type: 'markdown',
              source: ['# This is a markdown cell\n', 'import numpy as np\n']
            },
            {
              cell_type: 'code',
              source: 'df.to_csv("output.csv")'
            }
          ]
        };
        const expectedCode = 'import pandas as pd\ndf = pd.read_csv("data.csv")\n\ndf.to_csv("output.csv")\n';
        expect(handler.extractCode(notebook)).toEqual(expectedCode);
      });
    });

    describe('scan', () => {
      it('should only process files and directories', () => {
        const handler = new JupyterHandler();
        expect(handler.scan(null)).toEqual({});
        expect(handler.scan(undefined)).toEqual({});
        expect(handler.scan({ type: 'other' })).toEqual({ type: 'other' });
      });

      it('should return the asset unmodified if it is not an included file', () => {
        const handler = new JupyterHandler();
        const asset = {
          uri: '/a/test.py',
          type: 'file',
          metadata: [],
        };
        const scannedAsset = handler.scan(asset);
        expect(scannedAsset).toEqual(asset);
      });

      it('should return the asset unmodified if it has already been scanned', () => {
        const handler = new JupyterHandler();
        const asset = {
          uri: '/a/test.ipynb',
          type: 'file',
          metadata: [
            {
              id: handler.id(),
            },
          ],
        };
        const scannedAsset = handler.scan(asset);
        expect(scannedAsset).toEqual(asset);
      });

      it('should handle read error', () => {
        fs.readFileSync.mockImplementationOnce(() => {
          throw new Error('Could not read file');
        });
        const handler = new JupyterHandler();
        const asset = {
          uri: '/a/test.ipynb',
          type: 'file',
          metadata: [],
        };
        const scannedAsset = handler.scan(asset);
        expect(scannedAsset.metadata[0].error).toEqual('Could not read file');
      });

      it('should handle JSON parse error', () => {
        fs.readFileSync.mockReturnValue('{ invalid json');
        const handler = new JupyterHandler();
        const asset = {
          uri: '/a/test.ipynb',
          type: 'file',
          metadata: [],
        };
        const scannedAsset = handler.scan(asset);
        expect(typeof scannedAsset.metadata[0].error).toEqual('string');
        expect(scannedAsset.metadata[0].error.length).toBeGreaterThan(0);
      });

      it('should properly extract dependencies via PythonHandler', () => {
        const notebook = {
          metadata: { language_info: { name: 'python' } },
          cells: [
            {
              cell_type: 'code',
              source: [
                'import pandas as pd\n',
                'import matplotlib.pyplot as plt\n',
                'df = pd.read_csv("input.csv")\n',
                'df.to_csv("output.csv")\n',
                'plt.savefig("plot.png")\n'
              ]
            }
          ]
        };
        fs.readFileSync.mockReturnValue(JSON.stringify(notebook));
        
        const handler = new JupyterHandler();
        const asset = {
          uri: '/a/test.ipynb',
          type: 'file',
          metadata: [],
        };
        
        const scannedAsset = handler.scan(asset);
        const metadata = scannedAsset.metadata[0];
        
        expect(metadata.libraries.length).toEqual(2);
        expect(metadata.libraries[0].module).toBeNull();
        expect(metadata.libraries[0].import).toEqual('pandas');
        expect(metadata.libraries[0].alias).toEqual('pd');
        
        expect(metadata.inputs.length).toEqual(1);
        expect(metadata.inputs[0].path).toEqual('"input.csv"');
        
        expect(metadata.outputs.length).toEqual(2);
        expect(metadata.outputs[0].path).toEqual('"plot.png"');
        expect(metadata.outputs[1].path).toEqual('"output.csv"');
      });

      it('should properly extract dependencies via RHandler', () => {
        const notebook = {
          metadata: { kernelspec: { language: 'R' } },
          cells: [
            {
              cell_type: 'code',
              source: [
                'library(dplyr)\n',
                'data <- read.csv("input.csv")\n',
                'write.csv(data, "output.csv")\n'
              ]
            }
          ]
        };
        fs.readFileSync.mockReturnValue(JSON.stringify(notebook));
        
        const handler = new JupyterHandler();
        const asset = {
          uri: '/a/test.ipynb',
          type: 'file',
          metadata: [],
        };
        
        const scannedAsset = handler.scan(asset);
        const metadata = scannedAsset.metadata[0];
        
        expect(metadata.libraries.length).toEqual(1);
        expect(metadata.libraries[0].id).toEqual('dplyr');
        expect(metadata.inputs.length).toEqual(1);
        expect(metadata.outputs.length).toEqual(1);
      });

      it('should ignore unsupported languages gracefully', () => {
        const notebook = {
          metadata: { language_info: { name: 'julia' } },
          cells: [
            {
              cell_type: 'code',
              source: ['using DataFrames\n']
            }
          ]
        };
        fs.readFileSync.mockReturnValue(JSON.stringify(notebook));
        
        const handler = new JupyterHandler();
        const asset = {
          uri: '/a/test.ipynb',
          type: 'file',
          metadata: [],
        };
        
        const scannedAsset = handler.scan(asset);
        const metadata = scannedAsset.metadata[0];
        
        // No error, but no libraries extracted since Julia isn't supported yet
        expect(metadata.error).toBeUndefined();
        expect(metadata.libraries).toBeUndefined();
      });


      it('should recursively scan directories', () => {
        const notebook = {
          cells: [
            {
              cell_type: 'code',
              source: ['import numpy as np']
            }
          ]
        };
        fs.readFileSync.mockReturnValue(JSON.stringify(notebook));

        const handler = new JupyterHandler();
        const asset = {
          uri: '/a',
          type: 'directory',
          children: [
            {
              uri: '/a/test.ipynb',
              type: 'file',
              metadata: [],
            },
          ],
        };
        const scannedAsset = handler.scan(asset);
        expect(scannedAsset.children[0].metadata[0].libraries.length).toEqual(1);
        expect(scannedAsset.children[0].metadata[0].libraries[0].import).toEqual('numpy');
      });
    });
  });
});
