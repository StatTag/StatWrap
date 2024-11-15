import React, { useRef, useState, useEffect } from 'react';
import { Tooltip } from '@mui/material';
import styles from './OverflowDiv.css';

// Code (with slight modifications) from: https://stackoverflow.com/a/61318377/5670646
const OverflowDiv = ({ children }) => {
  const [isOverflowed, setIsOverflow] = useState(false);
  const textElementRef = useRef();
  useEffect(() => {
    setIsOverflow(textElementRef.current.scrollWidth > textElementRef.current.clientWidth);
  }, []);
  return (
    <Tooltip title={children} disableHoverListener={!isOverflowed}>
      <div
        ref={textElementRef}
        className={styles.container}
        style={{
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {children}
      </div>
    </Tooltip>
  );
};

export default OverflowDiv;
