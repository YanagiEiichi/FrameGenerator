const FrameGenerator = require('../FrameGenerator');
const { Readable } = require('stream');

let fg = new FrameGenerator(function*() {
  return (yield 4).readUInt32BE(0);
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
