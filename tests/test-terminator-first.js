const FrameGenerator = require('../FrameGenerator');
const { Readable } = require('stream');

let fg = new FrameGenerator(function*() {
  return yield 'HTTP/1.1 200 OK';
});

class InputStream extends Readable {
  constructor() {
    super();
    this.push('HTTP/1.1 200 OK');
    setTimeout(() => {
      this.push(null);
    });
  }
  _read() {}
}

let answer = [ 'HTTP/1.1 200 OK' ];

let capacitance = [];
new InputStream().pipe(fg)

  .on('data', frame => {
    capacitance.push(frame + '');
  })

  .on('end', () => {
    let result = answer.every((item, index) => capacitance[index] === item);
    process.exit(!result);
  });
