const FrameGenerator = require('../FrameGenerator');
const { Readable } = require('stream');

const sub = function*(length) {
  if (length) {
    return Buffer.concat([ yield 1, yield sub(length - 1) ]);
  } else {
    return new Buffer(0);
  }
};

let fg = new FrameGenerator(function*() {
  return (yield sub(4)).readInt32BE(0);
});

class InputStream extends Readable {
  constructor() {
    super();
    for (let i = 0; i < 16; i++) {
      setTimeout(() => {
        this.push(new Buffer([ i ]));
      });
    }
    setTimeout(() => {
      this.push(null);
    });
  }
  _read() {}
}

let answer = [ 66051, 67438087, 134810123, 202182159 ];

let capacitance = [];
new InputStream().pipe(fg)

  .on('data', frame => {
    capacitance.push(frame);
  })

  .on('end', () => {
    let result = capacitance.every((item, index) => answer[index] === item);
    process.exit(!result);
  });
