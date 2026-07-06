import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';


jest.mock('@mui/material', () => {
  const React = require('react');
  return {
    List: ({ children, ...props }) =>
      React.createElement('mock-list', props, children),
    ListItemButton: ({ children, onClick, selected, ...props }) =>
      React.createElement('mock-list-item-button', { onClick, selected, ...props }, children),
    ListItemText: ({ primary, secondary, ...props }) =>
      React.createElement('mock-list-item-text', { ...props }, primary, secondary),
    Chip: ({ label, ...props }) =>
      React.createElement('mock-chip', { label, ...props }),
    IconButton: ({ children, onClick, ...props }) =>
      React.createElement('mock-icon-button', { onClick, ...props }, children),
    Tooltip: ({ children, title, ...props }) =>
      React.createElement('mock-tooltip', { title, ...props }, children),
  };
});
jest.mock('@mui/icons-material/Edit', () => {
  const React = require('react');
  return { __esModule: true, default: () => React.createElement('mock-edit-icon') };
});
jest.mock('@mui/icons-material/FileUpload', () => {
  const React = require('react');
  return { __esModule: true, default: () => React.createElement('mock-file-upload-icon') };
});
jest.mock('@mui/icons-material/Delete', () => {
  const React = require('react');
  return { __esModule: true, default: () => React.createElement('mock-delete-icon') };
});


const ProjectTemplateList =
  require('../../app/components/ProjectTemplateList/ProjectTemplateList').default;

  
const builtInTemplate = {
  id: 'STATWRAP-BASIC',
  version: '1',
  name: 'Basic Research',
  description: 'A basic research project structure',
};

const customTemplate = {
  id: 'CUSTOM-12345',
  version: '1',
  name: 'My Lab Template',
  description: 'Custom lab template',
  isCustom: true,
};

const mixedTemplates = [builtInTemplate, customTemplate];

describe('components', () => {
  describe('ProjectTemplateList', () => {

    it('should render a list item for each template', () => {
      const onSelect = jest.fn();
      const renderer = TestRenderer.create(
        <ProjectTemplateList templates={mixedTemplates} onSelect={onSelect} />,
      );
      const items = renderer.root.findAllByType('mock-list-item-button');
      expect(items.length).toBe(2);
    });

    it('should NOT render a "Custom" chip for built-in templates', () => {
      const onSelect = jest.fn();
      const renderer = TestRenderer.create(
        <ProjectTemplateList templates={[builtInTemplate]} onSelect={onSelect} />,
      );
      const chips = renderer.root.findAllByType('mock-chip');
      expect(chips.length).toBe(0);
    });

    it('should render a "Custom" chip for templates with isCustom = true', () => {
      const onSelect = jest.fn();
      const renderer = TestRenderer.create(
        <ProjectTemplateList templates={[customTemplate]} onSelect={onSelect} />,
      );
      const chips = renderer.root.findAllByType('mock-chip');
      expect(chips.length).toBe(1);
      expect(chips[0].props.label).toBe('Custom');
    });

    it('should render Edit, Export, and Delete icon buttons ONLY for custom templates', () => {
      const onSelect = jest.fn();
      const renderer = TestRenderer.create(
        <ProjectTemplateList
          templates={mixedTemplates}
          onSelect={onSelect}
          onEdit={jest.fn()}
          onExport={jest.fn()}
          onDelete={jest.fn()}
        />,
      );
      
      const iconButtons = renderer.root.findAllByType('mock-icon-button');
      expect(iconButtons.length).toBe(3);
    });

    it('should NOT render action icons for built-in templates even when handlers are provided', () => {
      const onSelect = jest.fn();
      const renderer = TestRenderer.create(
        <ProjectTemplateList
          templates={[builtInTemplate]}
          onSelect={onSelect}
          onEdit={jest.fn()}
          onExport={jest.fn()}
          onDelete={jest.fn()}
        />,
      );
      const iconButtons = renderer.root.findAllByType('mock-icon-button');
      expect(iconButtons.length).toBe(0);
    });

    it('should call onSelect with the template id and version when a list item is clicked', () => {
      const onSelect = jest.fn();
      const renderer = TestRenderer.create(
        <ProjectTemplateList templates={[builtInTemplate]} onSelect={onSelect} />,
      );
      const item = renderer.root.findByType('mock-list-item-button');
      act(() => { item.props.onClick(); });
      expect(onSelect).toHaveBeenCalledWith('STATWRAP-BASIC', '1');
    });

    it('should call onEdit with the full template object when the edit icon is clicked', () => {
      const onSelect = jest.fn();
      const onEdit = jest.fn();
      const renderer = TestRenderer.create(
        <ProjectTemplateList
          templates={[customTemplate]}
          onSelect={onSelect}
          onEdit={onEdit}
          onExport={jest.fn()}
          onDelete={jest.fn()}
        />,
      );
      const iconButtons = renderer.root.findAllByType('mock-icon-button');
     
      act(() => { iconButtons[0].props.onClick(); });
      expect(onEdit).toHaveBeenCalledWith(customTemplate);
    });

    it('should call onExport with the template id when the export icon is clicked', () => {
      const onSelect = jest.fn();
      const onExport = jest.fn();
      const renderer = TestRenderer.create(
        <ProjectTemplateList
          templates={[customTemplate]}
          onSelect={onSelect}
          onEdit={jest.fn()}
          onExport={onExport}
          onDelete={jest.fn()}
        />,
      );
      const iconButtons = renderer.root.findAllByType('mock-icon-button');
      
      act(() => { iconButtons[1].props.onClick(); });
      expect(onExport).toHaveBeenCalledWith('CUSTOM-12345');
    });

    it('should call onDelete with the full template object when the delete icon is clicked', () => {
      const onSelect = jest.fn();
      const onDelete = jest.fn();
      const renderer = TestRenderer.create(
        <ProjectTemplateList
          templates={[customTemplate]}
          onSelect={onSelect}
          onEdit={jest.fn()}
          onExport={jest.fn()}
          onDelete={onDelete}
        />,
      );
      const iconButtons = renderer.root.findAllByType('mock-icon-button');
  
      act(() => { iconButtons[2].props.onClick(); });
      expect(onDelete).toHaveBeenCalledWith(customTemplate);
    });
  });
});