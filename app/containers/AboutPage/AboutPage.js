import React, { Component } from 'react';
import styles from './AboutPage.css';

export default class AboutPage extends Component {
  render() {
    return (
      <div className={styles.container} data-tid="container">
        <h1>StatWrap v0.17</h1>
        <div className={styles.copyright}>
          (c) 2021-2025 Northwestern University Feinberg School of Medicine
        </div>
        <div className={styles.acknowledgement}>
          <h2>Acknowledgements</h2>
          <div>
            Development of StatWrap was supported, in part, by the National Institutes of
            Health&apos;s National Center for Advancing Translational Sciences, Grant Number
            UL1TR001422 presented to{' '}
            <a href="https://www.nucats.northwestern.edu/" target="_blank" rel="noreferrer">
              Northwestern University Clinical and Translational Sciences Institute
            </a>
            . The content is solely the responsibility of the developers and does not necessarily
            represent the official views of the National Institutes of Health.
          </div>

          <div>
            StatWrap makes use of multiple open source projects. Use of these projects does not
            imply endorsement of StatWrap by the respective project owners, or endorsement of the
            use of these projects by Northwestern University. Given the number of packages and
            libraries used, please review our{' '}
            <a
              href="https://github.com/StatTag/StatWrap/blob/master/package.json"
              target="_blank"
              rel="noreferrer"
            >
              package.json
            </a>{' '}
            and{' '}
            <a
              href="https://github.com/StatTag/StatWrap/blob/master/yarn.lock"
              target="_blank"
              rel="noreferrer"
            >
              yarn.lock
            </a>{' '}
            which contain all versions loaded in the latest build.
          </div>
        </div>
      </div>
    );
  }
}
