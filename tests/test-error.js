const FrameGenerator = require('../FrameGenerator');
const { Readable } = require('stream');
const assert = require('assert');

let fg = new FrameGenerator(function*() {
  let [ byte ] = yield 1;
  if (byte === 4) throw new Error('hehe');
  return byte;
});

class InputStream extends Readable {
  constructor() {
    super();
    for (let i = 0; i < 16; i++) {
      this.push(new Buffer([ i ]));
    }
    this.push(null);
  }
  _read() {}
}

let capacitance = [];
new InputStream().pipe(fg)

  .on('data', frame => {
    capacitance.push(frame);
  })

  .on('error', (error) => {
    assert.equal(error.message, 'hehe');
    assert.deepEqual(capacitance, [ 0, 1, 2, 3 ]);
    process.exit(0);
  });
