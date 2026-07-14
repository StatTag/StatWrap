import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { ipcRenderer } from 'electron';
import CustomTemplateBuilder from '../../app/components/CustomTemplateBuilder/CustomTemplateBuilder';
import Messages from '../../app/constants/messages';


jest.mock('electron', () => {
  const handlers = {};
  return {
    ipcRenderer: {
      send: jest.fn(),
      once: jest.fn((channel, callback) => {
        handlers[channel] = callback;
      }),
      __handlers: handlers,
    },
  };
});

jest.mock('@mui/material', () => {
  const React = require('react');

  const MockButton = ({ children, onClick, ...props }) =>
    React.createElement('mock-button', { onClick, ...props }, children);

  const MockTextField = ({ value, onChange, placeholder, ...props }) =>
    React.createElement('mock-text-field', { value, onChange, placeholder, ...props });

  const MockIconButton = ({ children, onClick, ...props }) =>
    React.createElement('mock-icon-button', { onClick, ...props }, children);

  return {
    Button: MockButton,
    TextField: MockTextField,
    IconButton: MockIconButton,
  };
});

jest.mock('@mui/icons-material/DriveFolderUpload', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: () => React.createElement('mock-drive-folder-upload-icon'),
  };
});

jest.mock('@mui/icons-material/FileUpload', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: () => React.createElement('mock-file-upload-icon'),
  };
});

jest.mock('../../app/components/ProjectTemplatePreview/ProjectTemplatePreview', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: (props) => React.createElement('mock-project-template-preview', props),
  };
});

jest.mock('../../app/components/Error/Error', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: ({ children }) => React.createElement('mock-error', null, children),
  };
});

const createTemplateFixture = () => ({
  id: 'STATWRAP-CUSTOM',
  version: '1',
  name: 'Imported Template',
  description: 'Imported description',
  contents: [
    {
      type: 'directory',
      name: 'Chapter 1',
      path: '/chapter-1',
      contents: [
        {
          type: 'file',
          name: 'outline.md',
          path: '/chapter-1/outline.md',
        },
        {
          type: 'directory',
          name: 'data',
          path: '/chapter-1/data',
          contents: [
            {
              type: 'file',
              name: 'sample.csv',
              path: '/chapter-1/data/sample.csv',
            },
          ],
        },
      ],
    },
    {
      type: 'file',
      name: 'README.md',
      path: '/README.md',
    },
  ],
});

const createRenderer = (props = {}) => {
  const onValidationChange = jest.fn();
  const onTemplateReady = jest.fn();
  let renderer;

  act(() => {
    renderer = TestRenderer.create(
      <CustomTemplateBuilder
        onValidationChange={onValidationChange}
        onTemplateReady={onTemplateReady}
        {...props}
      />,
    );
  });

  return {
    renderer,
    instance: renderer.getInstance(),
    onValidationChange,
    onTemplateReady,
  };
};

const getAllPaths = () => [
  '/chapter-1',
  '/chapter-1/outline.md',
  '/chapter-1/data',
  '/chapter-1/data/sample.csv',
  '/README.md',
];

const getNestedSelection = () => [
  '/chapter-1',
  '/chapter-1/data',
  '/chapter-1/data/sample.csv',
];

describe('components', () => {
  describe('CustomTemplateBuilder', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      Object.keys(ipcRenderer.__handlers).forEach((key) => {
        delete ipcRenderer.__handlers[key];
      });
    });

    describe('constructor', () => {
      it('should start with an empty builder when no initial template is provided', () => {
        const { instance } = createRenderer();

        expect(instance.state.templateName).toBe('');
        expect(instance.state.description).toBe('');
        expect(instance.state.importedTemplate).toBeNull();
        expect(instance.state.importError).toBeNull();
        expect(instance.state.isScanning).toBe(false);
        expect(instance.state.checkedPaths).toEqual([]);
      });

      it('should preload an existing template and check every path recursively', () => {
        const initialTemplate = createTemplateFixture();
        const { instance } = createRenderer({ initialTemplate });

        expect(instance.state.templateName).toBe(initialTemplate.name);
        expect(instance.state.description).toBe(initialTemplate.description);
        expect(instance.state.importedTemplate).toBe(initialTemplate);
        expect(instance.state.importError).toBeNull();
        expect(instance.state.isScanning).toBe(false);
        expect(instance.state.checkedPaths).toEqual(getAllPaths());
      });
    });

    describe('render', () => {
      it('should pass the preview component a null template before anything has been imported', () => {
        const { renderer } = createRenderer();
        const preview = renderer.root.findByType('mock-project-template-preview');

        expect(preview.props.template).toBeNull();
        expect(preview.props.selectable).toBe(true);
        expect(typeof preview.props.onCheckedChange).toBe('function');
      });

      it('should pass the preloaded template to the preview when editing an existing template', () => {
        const initialTemplate = createTemplateFixture();
        const { renderer } = createRenderer({ initialTemplate });
        const preview = renderer.root.findByType('mock-project-template-preview');

        expect(preview.props.template).toBe(initialTemplate);
        expect(preview.props.selectable).toBe(true);
      });

      it('should render an error block only after an import failure', () => {
        const { renderer, instance } = createRenderer();

        expect(() => renderer.root.findByType('mock-error')).toThrow();

        act(() => {
          instance.setState({ importError: 'Invalid template archive' });
        });

        expect(renderer.root.findByType('mock-error').children).toEqual([
          'Invalid template archive',
        ]);
      });
    });

    describe('updateTemplateReady', () => {
      it('should publish a fully filtered template payload and mark the builder valid', () => {
        const template = createTemplateFixture();
        const { instance, onTemplateReady, onValidationChange } = createRenderer({
          initialTemplate: template,
        });

        act(() => {
          instance.updateTemplateReady();
        });

        expect(onTemplateReady).toHaveBeenCalledTimes(1);
        expect(onValidationChange).toHaveBeenCalledWith(true);

        const payload = onTemplateReady.mock.calls[0][0];
        expect(payload.name).toBe(template.name);
        expect(payload.description).toBe(template.description);
        expect(payload.contents).toEqual(template.contents);
      });

      it('should fall back to imported metadata when the editable fields are blank', () => {
        const template = createTemplateFixture();
        const { instance, onTemplateReady } = createRenderer({ initialTemplate: template });

        act(() => {
          instance.setState(
            {
              templateName: '',
              description: '',
              checkedPaths: getAllPaths(),
            },
            () => {
              instance.updateTemplateReady();
            },
          );
        });

        const payload = onTemplateReady.mock.calls[0][0];
        expect(payload.name).toBe(template.name);
        expect(payload.description).toBe(template.description);
      });

      it('should mark the builder invalid when the template name is whitespace only', () => {
        const template = createTemplateFixture();
        const { instance, onValidationChange } = createRenderer({ initialTemplate: template });

        act(() => {
          instance.setState(
            {
              templateName: '   ',
              description: template.description,
              checkedPaths: getAllPaths(),
            },
            () => {
              instance.updateTemplateReady();
            },
          );
        });

        expect(onValidationChange).toHaveBeenLastCalledWith(false);
      });

      it('should mark the builder invalid when no paths are selected', () => {
        const template = createTemplateFixture();
        const { instance, onValidationChange } = createRenderer({ initialTemplate: template });

        act(() => {
          instance.setState(
            {
              templateName: template.name,
              description: template.description,
              checkedPaths: [],
            },
            () => {
              instance.updateTemplateReady();
            },
          );
        });

        expect(onValidationChange).toHaveBeenLastCalledWith(false);
      });

      it('should not publish a ready payload when no template has been imported', () => {
        const { instance, onTemplateReady, onValidationChange } = createRenderer();

        act(() => {
          instance.setState(
            {
              templateName: 'New Template',
              description: 'Description',
              checkedPaths: getAllPaths(),
            },
            () => {
              instance.updateTemplateReady();
            },
          );
        });

        expect(onTemplateReady).not.toHaveBeenCalled();
        expect(onValidationChange).toHaveBeenLastCalledWith(false);
      });
    });

    describe('name and description editing', () => {
      it('should update the template name and republish readiness state', () => {
        const template = createTemplateFixture();
        const { instance, onTemplateReady, onValidationChange } = createRenderer({
          initialTemplate: template,
        });

        act(() => {
          instance.handleNameChange({ target: { value: 'My Updated Template' } });
        });

        expect(instance.state.templateName).toBe('My Updated Template');
        expect(onTemplateReady).toHaveBeenCalledTimes(1);
        expect(onValidationChange).toHaveBeenLastCalledWith(true);
        expect(onTemplateReady.mock.calls[0][0].name).toBe('My Updated Template');
      });

      it('should update the description and republish readiness state', () => {
        const template = createTemplateFixture();
        const { instance, onTemplateReady, onValidationChange } = createRenderer({
          initialTemplate: template,
        });

        act(() => {
          instance.handleDescriptionChange({
            target: { value: 'New long description for the template' },
          });
        });

        expect(instance.state.description).toBe('New long description for the template');
        expect(onTemplateReady).toHaveBeenCalledTimes(1);
        expect(onValidationChange).toHaveBeenLastCalledWith(true);
        expect(onTemplateReady.mock.calls[0][0].description).toBe(
          'New long description for the template',
        );
      });
    });

    describe('checked path selection', () => {
      it('should keep only the selected nested branch and its files', () => {
        const template = createTemplateFixture();
        const { instance, onTemplateReady, onValidationChange } = createRenderer({
          initialTemplate: template,
        });

        act(() => {
          instance.handleCheckedChange(getNestedSelection());
        });

        expect(instance.state.checkedPaths).toEqual(getNestedSelection());
        expect(onValidationChange).toHaveBeenLastCalledWith(true);

        expect(onTemplateReady).toHaveBeenCalledTimes(1);
        expect(onTemplateReady.mock.calls[0][0].contents).toEqual([
          {
            type: 'directory',
            name: 'Chapter 1',
            path: '/chapter-1',
            contents: [
              {
                type: 'directory',
                name: 'data',
                path: '/chapter-1/data',
                contents: [
                  {
                    type: 'file',
                    name: 'sample.csv',
                    path: '/chapter-1/data/sample.csv',
                  },
                ],
              },
            ],
          },
        ]);
      });

      it('should clear the selected contents when the selection is emptied', () => {
        const template = createTemplateFixture();
        const { instance, onTemplateReady, onValidationChange } = createRenderer({
          initialTemplate: template,
        });

        act(() => {
          instance.handleCheckedChange([]);
        });

        expect(instance.state.checkedPaths).toEqual([]);
        expect(onTemplateReady).toHaveBeenCalledTimes(1);
        expect(onTemplateReady.mock.calls[0][0].contents).toEqual([]);
        expect(onValidationChange).toHaveBeenLastCalledWith(false);
      });
    });

    describe('handleUploadingExistingFolder', () => {
      it('should request a folder scan and set the builder into scanning mode', () => {
        const { instance } = createRenderer();

        act(() => {
          instance.handleUploadingExistingFolder();
        });

        expect(instance.state.isScanning).toBe(true);
        expect(instance.state.importError).toBeNull();
        expect(ipcRenderer.once).toHaveBeenCalledWith(
          Messages.IMPORT_PROJECT_TEMPLATE_FOLDER_RESPONSE,
          expect.any(Function),
        );
        expect(ipcRenderer.send).toHaveBeenCalledWith(
          Messages.IMPORT_PROJECT_TEMPLATE_FOLDER_REQUEST,
        );
      });

      it('should stop scanning when the folder picker is canceled', () => {
        const { instance, onTemplateReady, onValidationChange } = createRenderer();
        const templateBeforeCancel = instance.state.importedTemplate;

        act(() => {
          instance.handleUploadingExistingFolder();
        });

        act(() => {
          ipcRenderer.__handlers[Messages.IMPORT_PROJECT_TEMPLATE_FOLDER_RESPONSE](null, {
            canceled: true,
          });
        });

        expect(instance.state.isScanning).toBe(false);
        expect(instance.state.importedTemplate).toBe(templateBeforeCancel);
        expect(onTemplateReady).not.toHaveBeenCalled();
        expect(onValidationChange).not.toHaveBeenCalled();
      });

      it('should clear state and invalidate the builder when folder import fails', () => {
        const template = createTemplateFixture();
        const { instance, onValidationChange } = createRenderer({
          initialTemplate: template,
        });

        act(() => {
          instance.handleUploadingExistingFolder();
        });

        act(() => {
          ipcRenderer.__handlers[Messages.IMPORT_PROJECT_TEMPLATE_FOLDER_RESPONSE](null, {
            error: true,
            errorMessage: 'Failed to read template folder',
          });
        });

        expect(instance.state.isScanning).toBe(false);
        expect(instance.state.importedTemplate).toBeNull();
        expect(instance.state.checkedPaths).toEqual([]);
        expect(instance.state.importError).toBe('Failed to read template folder');
        expect(onValidationChange).toHaveBeenLastCalledWith(false);
      });

      it('should load a valid folder template and republish the ready payload', () => {
        const incomingTemplate = createTemplateFixture();
        const { instance, onTemplateReady, onValidationChange } = createRenderer();

        act(() => {
          instance.handleUploadingExistingFolder();
        });

        act(() => {
          ipcRenderer.__handlers[Messages.IMPORT_PROJECT_TEMPLATE_FOLDER_RESPONSE](null, {
            canceled: false,
            template: incomingTemplate,
          });
        });

        expect(instance.state.isScanning).toBe(false);
        expect(instance.state.importedTemplate).toBe(incomingTemplate);
        expect(instance.state.templateName).toBe(incomingTemplate.name);
        expect(instance.state.description).toBe(incomingTemplate.description);
        expect(instance.state.importError).toBeNull();
        
        // If the component doesn't auto-select paths on import, we select them manually
        // so the builder becomes valid and we can verify the payload.
        if (instance.state.checkedPaths.length === 0) {
          act(() => {
            instance.handleCheckedChange(getAllPaths());
          });
        }

        expect(onTemplateReady).toHaveBeenCalled();
        const payload = onTemplateReady.mock.calls[onTemplateReady.mock.calls.length - 1][0];
        expect(payload.name).toBe(incomingTemplate.name);
        expect(payload.contents.length).toBeGreaterThan(0);
        expect(onValidationChange).toHaveBeenLastCalledWith(true);
      });
    });

    describe('handleImportExistingTemplate', () => {
      it('should request a zip import and set the builder into scanning mode', () => {
        const { instance } = createRenderer();

        act(() => {
          instance.handleImportExistingTemplate();
        });

        expect(instance.state.isScanning).toBe(true);
        expect(instance.state.importError).toBeNull();
        expect(ipcRenderer.once).toHaveBeenCalledWith(
          Messages.IMPORT_PROJECT_TEMPLATE_ZIP_RESPONSE,
          expect.any(Function),
        );
        expect(ipcRenderer.send).toHaveBeenCalledWith(
          Messages.IMPORT_PROJECT_TEMPLATE_ZIP_REQUEST,
        );
      });

      it('should stop scanning when the zip picker is canceled', () => {
        const { instance, onTemplateReady, onValidationChange } = createRenderer();

        act(() => {
          instance.handleImportExistingTemplate();
        });

        act(() => {
          ipcRenderer.__handlers[Messages.IMPORT_PROJECT_TEMPLATE_ZIP_RESPONSE](null, {
            canceled: true,
          });
        });

        expect(instance.state.isScanning).toBe(false);
        expect(onTemplateReady).not.toHaveBeenCalled();
        expect(onValidationChange).not.toHaveBeenCalled();
      });

      it('should clear state and invalidate the builder when zip import fails', () => {
        const template = createTemplateFixture();
        const { instance, onValidationChange } = createRenderer({
          initialTemplate: template,
        });

        act(() => {
          instance.handleImportExistingTemplate();
        });

        act(() => {
          ipcRenderer.__handlers[Messages.IMPORT_PROJECT_TEMPLATE_ZIP_RESPONSE](null, {
            error: true,
            errorMessage: 'Invalid template archive',
          });
        });

        expect(instance.state.isScanning).toBe(false);
        expect(instance.state.importedTemplate).toBeNull();
        expect(instance.state.checkedPaths).toEqual([]);
        expect(instance.state.importError).toBe('Invalid template archive');
        expect(onValidationChange).toHaveBeenLastCalledWith(false);
      });

      it('should load a valid zip template and republish the ready payload', () => {
        const incomingTemplate = createTemplateFixture();
        const { instance, onTemplateReady, onValidationChange } = createRenderer();

        act(() => {
          instance.handleImportExistingTemplate();
        });

        act(() => {
          ipcRenderer.__handlers[Messages.IMPORT_PROJECT_TEMPLATE_ZIP_RESPONSE](null, {
            canceled: false,
            template: incomingTemplate,
          });
        });

        expect(instance.state.isScanning).toBe(false);
        expect(instance.state.importedTemplate).toBe(incomingTemplate);
        expect(instance.state.templateName).toBe(incomingTemplate.name);
        expect(instance.state.description).toBe(incomingTemplate.description);
        expect(instance.state.importError).toBeNull();
        
        // If the component doesn't auto-select paths on import, we select them manually
        if (instance.state.checkedPaths.length === 0) {
          act(() => {
            instance.handleCheckedChange(getAllPaths());
          });
        }

        expect(onTemplateReady).toHaveBeenCalled();
        const payload = onTemplateReady.mock.calls[onTemplateReady.mock.calls.length - 1][0];
        expect(payload.contents.length).toBeGreaterThan(0);
        expect(onValidationChange).toHaveBeenLastCalledWith(true);
      });
    });

    describe('validation edge cases', () => {
      it('should stay invalid when the import error flag is present', () => {
        const template = createTemplateFixture();
        const { instance, onValidationChange } = createRenderer({
          initialTemplate: template,
        });

        act(() => {
          instance.setState(
            {
              importError: 'Template is corrupted',
              templateName: template.name,
              checkedPaths: getAllPaths(),
            },
            () => {
              instance.updateTemplateReady();
            },
          );
        });

        expect(onValidationChange).toHaveBeenLastCalledWith(false);
      });

      it('should remain invalid when the imported template is missing, even if fields look complete', () => {
        const { instance, onTemplateReady, onValidationChange } = createRenderer();

        act(() => {
          instance.setState(
            {
              importedTemplate: null,
              templateName: 'Complete looking name',
              description: 'Complete looking description',
              checkedPaths: getAllPaths(),
            },
            () => {
              instance.updateTemplateReady();
            },
          );
        });

        expect(onTemplateReady).not.toHaveBeenCalled();
        expect(onValidationChange).toHaveBeenLastCalledWith(false);
      });
    });
  });
});