const { Transform } = require('stream');

class FrameGenerator extends Transform {
  constructor(generator) {
    super({ readableObjectMode : true });
    this.generator = generator;
    this.position = 0;
    this.buffer = new Buffer(0);
    this.generate();
  }
  // Begin to generate a frame throgh the Generator Function
  generate() {
    this.iterator = this.generator();
    this.step = this.resolver();
  }
  // resolve the "yield" result and begin to next phase
  phase(data) {
    this.step = this.resolver(data);
    this.step.next();
  }
  // Fulfill the frame data and begin to next
  fulfill(frame) {
    this.push(frame);
    this.generate();
    this.step.next();
  }
  // Waiting for input stream and try to resolve frame data
  *resolver(args) {
    let { done, value } = this.iterator.next(args);
    // Output the frame result in stream and begin to generate next frame, if Generator Function returned
    if (done) return this.fulfill(value);
    // Otherwise
    if (typeof value === 'string') value = { terminator: value };
    if (typeof value === 'number') value = { length: value };
    // Usage 1: Read until terminator string
    if ('terminator' in value) {
      let terminator = new Buffer(value.terminator);
      let lastIndex = 0;
      let result = [];
      while (true) {
        while (this.buffer.length <= this.position) yield this.next();
        let byte = this.buffer[this.position++];
        result.push(byte);
        if (byte === terminator[lastIndex]) {
          if (lastIndex + 1 >= terminator.length) {
            this.phase(new Buffer(result));
            break;
          } else {
            lastIndex++;
          }
        } else {
          lastIndex = 0;
        }
      }
    }
    // Usage 2: Read a known length
    else if ('length' in value) {
      while (this.buffer.length - this.position < value.length) yield this.next();
      let result;
      if (typeof value.read === 'function') {
        result = value.read(this.buffer, this.position);
      } else {
        result = this.buffer.slice(this.position, this.position + value.length);
      }
      this.position += value.length;
      this.phase(result);
    }
    // Otherwise: Throw an error
    else {
      throw new Error('FrameGenerator: Unknown yield format');
    }
  }
  // Stream input event, resume the "resolver"
  _write(buffer, enc, next) {
    this.buffer = Buffer.concat([ this.buffer.slice(this.position), buffer ]);
    this.position = 0;
    this.next = next;
    this.step.next();
  }
}

module.exports = FrameGenerator;
