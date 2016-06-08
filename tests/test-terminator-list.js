const FrameGenerator = require('../FrameGenerator');
const { Readable } = require('stream');

let fg = new FrameGenerator(function*() {
  let [ buffer, terminator ] = yield [ '\r', '\n' ];
  return parseInt(buffer);
});

class InputStream extends Readable {
  constructor() {
    super();
    for (let i = 0; i < 16; i++) {
      if (i % 4 === 0) {
        setTimeout(() => {
          this.push('0x');
        });
      }
      setTimeout(() => {
        this.push(i.toString(16));
      });
      if ((i + 1) % 4 === 0) {
        setTimeout(() => {
          this.push((i + 1) % 8 ? '\r' : '\n');
        });
      }
    }
    setTimeout(() => {
      this.push(null);
    });
  }
  _read() {}
}

let answer = [ 291, 17767, 35243, 52719 ];

let capacitance = [];
new InputStream().pipe(fg)

  .on('data', frame => {
    capacitance.push(frame);
  })

  .on('end', () => {
    let result = capacitance.every((item, index) => answer[index] === item);
    process.exit(!result);
  });
