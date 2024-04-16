/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/no-noninteractive-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
import * as React from 'react';
import { IconButton, Popover } from '@mui/material';
import { FaChevronDown, FaEdit, FaTrash } from 'react-icons/fa';
import styles from './EditableSelect.css';

const editableSelect = (props) => {
  const { title, data, selectedItem, disabled, onSelectItem, onEditItem, onDeleteItem } = props;
  const boxRef = React.useRef();
  const [displayValue, setDisplayValue] = React.useState(title);
  const [listOpen, setListOpen] = React.useState(false);

  const toggleList = () => {
    setListOpen((prevState) => !prevState);
  };

  React.useEffect(() => {
    // If there is no selected item, or if it doesn't match the selected
    // value that was there before, clear the display.
    setDisplayValue(selectedItem ? selectedItem.name : title);
  }, [data, selectedItem, title]);

  const handleSelectItem = (item) => {
    setDisplayValue(item ? item.name : title);
    setListOpen(false);

    if (onSelectItem) {
      onSelectItem(item);
    }
  };

  const handleItemClick = (item, fn, updateSelection) => {
    if (fn) {
      fn(item);
    }
    if (updateSelection) {
      setDisplayValue(item.name);
    }
    setListOpen(false);
  };

  let items = null;
  if (data) {
    items = [
      <hr key="separator" />,
      data.map((d) => {
        return (
          <li
            key={d.id}
            className={[
              styles.listItem,
              selectedItem && d.id === selectedItem.id ? styles.selected : '',
            ].join(' ')}
          >
            <div className={styles.itemContainer} onClick={() => handleSelectItem(d)}>
              <div className={styles.itemName}>{d.name}</div>
              {d.details ? <div className={styles.itemDetails}>{d.details}</div> : null}
            </div>
            <IconButton
              className={styles.itemButton}
              aria-label="edit item"
              onClick={() => handleItemClick(d, onEditItem, true)}
            >
              <FaEdit fontSize="small" />
            </IconButton>
            <IconButton
              className={styles.itemButton}
              aria-label="delete item"
              onClick={() => handleItemClick(d, onDeleteItem, false)}
            >
              <FaTrash fontSize="small" />
            </IconButton>
          </li>
        );
      }),
    ];
  }

  return (
    <div className={styles.container} ref={boxRef}>
      <IconButton
        className={styles.toolbarButton}
        aria-label="select item from list"
        onClick={toggleList}
        disabled={disabled}
      >
        {displayValue} &nbsp;
        <FaChevronDown fontSize="small" />
      </IconButton>
      <Popover
        className={styles.listContainer}
        open={listOpen}
        onClose={toggleList}
        anchorEl={boxRef.current}
      >
        <ul className={styles.list}>
          <li onClick={() => handleSelectItem(null)} className={styles.listItem}>
            <div>Clear selection</div>
          </li>
          {items}
        </ul>
      </Popover>
    </div>
  );
};

export default editableSelect;
