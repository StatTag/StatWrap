import React, { useState } from 'react';
import PropTypes from 'prop-types';
import ReactMarkdown from 'react-markdown';
import gfm from 'remark-gfm';
import Constants from '../../../constants/constants';
import styles from './GeneralAction.css';

const CollapsibleMarkdown = ({ content }) => {
  const [expanded, setExpanded] = useState(false);

  // Consider it "long" if it's over a certain length so we can show the toggle.
  const isLong = content && content.length > 200;
  
  return (
    <div className={`${styles.markdownContainer} markdown-body`}>
      <div className={expanded || !isLong ? styles.markdownFull : styles.markdownCollapsed}>
        <ReactMarkdown remarkPlugins={[gfm]} children={content} />
      </div>
      {isLong && (
        <button 
          className={styles.toggleButton} 
          onClick={() => setExpanded(!expanded)}
          type="button"
        >
          {expanded ? 'Show less' : 'Show more'}
        </button>
      )}
    </div>
  );
};

CollapsibleMarkdown.propTypes = {
  content: PropTypes.string,
};

const formatValue = (value) => {
  if (Array.isArray(value)) {
    return value.length > 0 ? value.join(', ') : <span className={styles.emptyContent}>(Empty)</span>;
  }
  if (typeof value === 'object' && value !== null) {
    if (value.contentType === Constants.DescriptionContentType.MARKDOWN) {
      if (!value.content) {
        return <span className={styles.emptyContent}>(Empty description)</span>;
      }
      return <CollapsibleMarkdown content={value.content} />;
    }
    return JSON.stringify(value);
  }
  return value || '';
};

const generateRow = (key, value) => {
  return (
    <div key={key} className={styles.row}>
      <span className={styles.label}>{key}:</span> {formatValue(value)}
    </div>
  );
};

function generalAction(props) {
  const { data } = props;

  // If the data or the underlying details aren't set, we are unable to render the
  // action details so provide a placeholder message.
  if (data === null || data === undefined || data.details === null || data.details === undefined) {
    return <div>No data</div>
  }
  const rows = Object.keys(data.details).map((k) => generateRow(k, data.details[k]));
  return <div className={styles.container}>{rows}</div>;
}

generalAction.propTypes = {
  data: PropTypes.object.isRequired,
};

export default generalAction;
