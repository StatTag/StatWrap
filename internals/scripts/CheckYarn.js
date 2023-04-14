// @flow
const fs = require('fs');

if (!/yarn\.js$/.test(process.env.npm_execpath || '')) {
  console.warn(
    "\u001b[33mYou don't seem to be using yarn. This could produce unexpected results.\u001b[39m"
  );
}

// We have experienced this issue for some time with this file and our setup not behaving.  The
// best solution discovered is to remove the file.  Not great, but if it works, we'll do it.
// TODO - Eventually figure out what's really going on, see if we can update the stack to resolve
// this, or something else.
const problemFile = './node_modules/node-gyp/lib/Find-VisualStudio.cs';
if (fs.existsSync(problemFile)) {
  fs.unlinkSync(problemFile);
}
