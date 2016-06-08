const FrameGenerator = require('../FrameGenerator');
const { Readable } = require('stream');

class InputStream extends Readable {
  constructor() {
    super();
    this.push(new Buffer(65535));
    setTimeout(() => {
      this.push(null);
    });
  }
  _read() {}
}

process.on('uncaughtException', reason => {
  process.exit(1);
});

new InputStream().pipe(new FrameGenerator(function*() {
  return yield 1;
}));
