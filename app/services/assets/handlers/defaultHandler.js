const fs = require('fs');

export default class DefaultHandler {
  static id = 'DefaultHandler';

  id() {
    return DefaultHandler.id;
  }

  scan(uri) {
    const result = { id: this.id() };
    if (!fs.accessSync(uri)) {
      return result;
    }

    fs.statSync(uri);
    return result;
  }
}
