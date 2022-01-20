/* eslint-disable no-restricted-syntax */
/* eslint-disable no-await-in-loop */
import git from 'isomorphic-git';
import fs from 'fs';

export default class SourceControlService {
  /**
   * Determine if source control is enabled for a given project.
   *
   * @param {string} projectPath The path to the project root. We will look for source control under here.
   */
  hasSourceControlEnabled(projectPath) {
    if (!projectPath) {
      return false;
    }

    try {
      fs.accessSync(projectPath);
    } catch {
      return false;
    }
  }
}

/*
const dir = '/Users/lvr491/Development/sw-test3';
const filepath = 'Analysis/Code/sas/CONSORT Analysis.sas';


(async () => {
  const commits = await git.log({ fs, dir });
  let lastSHA = null;
  let lastCommit = null;
  const commitsThatMatter = [];
  for (const commit of commits) {
    try {
      const o = await git.readObject({ fs, dir, oid: commit.oid, filepath });
      if (o.oid !== lastSHA) {
        if (lastSHA !== null) commitsThatMatter.push(lastCommit);
        lastSHA = o.oid;
      }
    } catch (err) {
      // file no longer there
      commitsThatMatter.push(lastCommit);
      break;
    }
    lastCommit = commit;
  }
  console.log(commitsThatMatter);
})();
*/
