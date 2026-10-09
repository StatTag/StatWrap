import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import AssetAttributes from '../../app/components/AssetAttributes/AssetAttributes';

jest.mock('@mui/material', () => Object.fromEntries([
  'Checkbox', 'FormControlLabel', 'IconButton', 'Dialog', 'DialogTitle',
  'DialogContent', 'DialogActions', 'TextField', 'Button', 'Tooltip', 'DialogContentText',
].map((name) => [name, name])));
jest.mock('@mui/icons-material', () => ({ Add: 'Add', Delete: 'Delete' }));

describe('AssetAttributes compact layout', () => {
  let renderer;
  let props;

  beforeEach(() => {
    props = {
      asset: { contentTypes: [], attributes: { reviewed: true } },
      configuration: [
        { id: 'reviewed', display: 'Reviewed', type: 'bool', default: false, appliesTo: ['*'] },
      ],
      onUpdateAttribute: jest.fn(),
      onAddCustomAttribute: jest.fn(),
    };
    act(() => {
      renderer = TestRenderer.create(<AssetAttributes {...props} />);
    });
  });

  afterEach(() => act(() => renderer.unmount()));

  it('places the add button alongside the list without a separate toolbar row', () => {
    const list = renderer.root.findByType('ul');
    const button = renderer.root.findByProps({ className: 'addButton' });
    expect(list.parent.props.className).toBe('attributesLayout');
    expect(button.parent).toBe(list.parent);
    expect(button.props.type).toBe('button');
  });

  it('still opens and saves a custom attribute', () => {
    act(() => renderer.root.findByProps({ className: 'addButton' }).props.onClick());
    expect(renderer.root.findAllByType('Dialog')[0].props.open).toBe(true);
    act(() => renderer.root.findByType('TextField').props.onChange({
      target: { value: 'Experimental' },
    }));
    act(() => renderer.root.findByProps({ className: 'saveButton' }).props.onClick());
    expect(props.onAddCustomAttribute).toHaveBeenCalledWith({
      id: 'custom_experimental',
      display: 'Experimental',
      type: 'bool',
      default: false,
      appliesTo: ['*'],
      source: 'custom',
    });
    expect(renderer.root.findAllByType('Dialog')[0].props.open).toBe(false);
  });

  it('preserves checkbox values and update callbacks', () => {
    const checkbox = renderer.root.findByType('FormControlLabel').props.control;
    expect(checkbox.props.checked).toBe(true);
    act(() => checkbox.props.onChange({ target: { name: 'reviewed', checked: false } }));
    expect(props.onUpdateAttribute).toHaveBeenCalledWith('reviewed', false);
  });

  it('keeps the add action available when there are no applicable attributes', () => {
    act(() => renderer.update(<AssetAttributes {...props} configuration={[]} />));
    expect(renderer.root.findAllByType('li')).toHaveLength(0);
    act(() => renderer.root.findByProps({ className: 'addButton' }).props.onClick());
    expect(renderer.root.findAllByType('Dialog')[0].props.open).toBe(true);
  });
});
