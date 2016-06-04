const { Transform } = require('stream');

class FrameGenerator extends Transform {
  constructor(generator) {
    super({ readableObjectMode : true });
    this.generator = generator;
    this.position = 0;
    this.buffer = new Buffer(0);
    this.begin();
  }
  begin() {
    this.iterator = this.generator();
    this.step = this.walker();
  }
  *walker(args) {
    let { done, value } = this.iterator.next(args);
    if (done) {
      this.push(value);
      this.begin();
      this.step.next();
    } else {
      while (this.buffer.length - this.position < value.length) yield this.next();
      let result = value.read(this.buffer, this.position);
      this.position += value.length;
      this.step = this.walker(result);
      this.step.next();
    }
  }
  _write(buffer, enc, next) {
    this.buffer = Buffer.concat([ this.buffer.slice(this.position), buffer ]);
    this.position = 0;
    this.next = next;
    this.step.next();
  }
}

module.exports = FrameGenerator;
