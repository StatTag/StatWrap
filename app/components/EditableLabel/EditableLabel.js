/*
  This is the react-inline-editing component from: https://github.com/bfischer/react-inline-editing
  Original license included at the bottom of this file.

  The version imported via yarn was not working, and so we needed to get the most recent version from
  GitHub.  This will also allow local customization when/if needed.

  2020-10-06 - Started customizing for our use.  This includes a multiline mode.
*/

import React from 'react';
import PropTypes from 'prop-types';

const ENTER_KEY_CODE = 13;
const DEFAULT_LABEL_PLACEHOLDER = 'Click To Edit';

export default class EditableLabel extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      isEditing: this.props.isEditing || false,
      text: this.props.text || '',
      originalText: this.props.text || '',
    };
  }

  componentDidUpdate(prevProps) {
    if (prevProps.text !== this.props.text) {
      this.setState({
        text: this.props.text || '',
      });
    }

    if (prevProps.isEditing !== this.props.isEditing) {
      this.setState((prevState) => ({
        isEditing: prevState.isEditing || this.props.isEditing || false,
      }));
    }
  }

  isTextValueValid = () => {
    return typeof this.state.text !== 'undefined' && this.state.text.trim().length > 0;
  };

  handleFocus = () => {
    const { onFocusOut, onFocus, emptyEdit = false } = this.props;

    if (this.state.isEditing && typeof onFocusOut === 'function') {
      onFocusOut(this.state.text);
    } else if (typeof onFocus === 'function') {
      onFocus(this.state.text);
    }

    if (this.isTextValueValid()) {
      this.setState((prevState) => ({
        isEditing: !prevState.isEditing,
        originalText: prevState.isEditing ? prevState.originalText : prevState.text,
      }));
    } else if (this.state.isEditing) {
      this.setState({
        isEditing: emptyEdit,
      });
    } else {
      this.setState((prevState) => ({
        isEditing: true,
        originalText: prevState.text,
      }));
    }
  };

  handleSave = () => {
    const { onFocusOut } = this.props;
    if (typeof onFocusOut === 'function') {
      onFocusOut(this.state.text);
    }
    this.setState({ isEditing: false });
  };

  handleCancel = () => {
    this.setState((prevState) => ({
      isEditing: false,
      text: prevState.originalText,
    }));
  };

  handleChange = () => {
    this.setState({
      text: this.textInput.value,
    });
  };

  handleKeyDown = (e) => {
    // We only allow enter-completion when this is a single line editor.
    const { multiline = false } = this.props;
    if (e.keyCode === ENTER_KEY_CODE && !multiline) {
      this.handleEnterKey();
    }
  };

  handleEnterKey = () => {
    this.handleFocus();
  };

  render() {
    const {
      multiline = false,
      containerClassName = null,
      inputClassName = null,
      inputWidth = null,
      inputHeight = null,
      inputFontSize = null,
      inputFontWeight = null,
      inputBorderWidth = null,
      inputMaxLength = 524288,
      inputPlaceHolder = null,
      inputTabIndex = 0,
      showSaveCancel = false,
      labelContainerClassName = null,
      labelClassName = null,
      labelFontSize = null,
      labelFontWeight = null,
      labelPlaceHolder = null,
    } = this.props;

    if (this.state.isEditing) {
      if (multiline) {
        return (
          <div className={containerClassName}>
            <textarea
              autoFocus
              className={inputClassName}
              ref={(input) => {
                this.textInput = input;
              }}
              value={this.state.text}
              onChange={this.handleChange}
              onBlur={showSaveCancel ? this.handleSave : this.handleFocus}
              style={{
                width: inputWidth,
                height: inputHeight,
                fontSize: inputFontSize,
                fontWeight: inputFontWeight,
                borderWidth: inputBorderWidth,
              }}
              maxLength={inputMaxLength}
              placeholder={inputPlaceHolder}
              tabIndex={inputTabIndex}
            />
            {showSaveCancel && (
              <div style={{ marginTop: '4px', display: 'flex', gap: '6px' }}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={this.handleSave}
                  style={{ fontSize: '0.75rem', padding: '2px 8px', cursor: 'pointer' }}
                >
                  Save
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={this.handleCancel}
                  style={{ fontSize: '0.75rem', padding: '2px 8px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        );
      }

      return (
        <div className={containerClassName}>
          <input
            autoFocus
            type="text"
            className={inputClassName}
            ref={(input) => {
              this.textInput = input;
            }}
            value={this.state.text}
            onChange={this.handleChange}
            onBlur={this.handleFocus}
            onKeyDown={this.handleKeyDown}
            style={{
              width: inputWidth,
              height: inputHeight,
              fontSize: inputFontSize,
              fontWeight: inputFontWeight,
              borderWidth: inputBorderWidth,
            }}
            maxLength={inputMaxLength}
            placeholder={inputPlaceHolder}
            tabIndex={inputTabIndex}
          />
        </div>
      );
    }

    const labelText = this.isTextValueValid()
      ? this.state.text
      : labelPlaceHolder || DEFAULT_LABEL_PLACEHOLDER;
    return (
      <div
        className={`${containerClassName || ''} ${labelContainerClassName || ''}`.trim()}
        onClick={this.handleFocus}
        style={{ cursor: 'text' }}
      >
        <label
          className={labelClassName}
          style={{
            fontSize: labelFontSize,
            fontWeight: labelFontWeight,
          }}
        >
          {labelText}
        </label>
      </div>
    );
  }
}

EditableLabel.propTypes = {
  text: PropTypes.string.isRequired,
  isEditing: PropTypes.bool,
  emptyEdit: PropTypes.bool,
  multiline: PropTypes.bool,

  labelClassName: PropTypes.string,
  labelContainerClassName: PropTypes.string,
  labelFontSize: PropTypes.string,
  labelFontWeight: PropTypes.string,
  labelPlaceHolder: PropTypes.string,

  showSaveCancel: PropTypes.bool,
  containerClassName: PropTypes.string,

  inputMaxLength: PropTypes.number,
  inputPlaceHolder: PropTypes.string,
  inputTabIndex: PropTypes.number,
  inputWidth: PropTypes.string,
  inputHeight: PropTypes.string,
  inputFontSize: PropTypes.string,
  inputFontWeight: PropTypes.string,
  inputClassName: PropTypes.string,
  inputBorderWidth: PropTypes.string,

  onFocus: PropTypes.func,
  onFocusOut: PropTypes.func,
};

/*
https://github.com/bfischer/react-inline-editing/blob/master/LICENSE

MIT License

Copyright (c) 2017 Blake Fischer

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/
