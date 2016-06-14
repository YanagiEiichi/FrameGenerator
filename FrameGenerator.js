const { Transform } = require('stream');

const matchString = function*(what) {
  let terminator = new Buffer(what);
  let index = 0;
  while (true) {
    let byte = yield index;
    if (byte === terminator[index]) {
      if (index + 1 >= terminator.length) {
        return terminator;
      } else {
        index++;
      }
    } else {
      index = 0;
    }
  }
}

class FrameGenerator extends Transform {
  constructor(generator) {
    super({ readableObjectMode : true });
    this.position = 0;
    this.buffer = new Buffer(0);
    this.stack = [];
    this.generator = generator;
    this.begin(generator);
  }
  // Begin to generate frames with a generator
  begin(generator, callback = result => this.push(result)) {
    this.stack.push(this.atomGenerator(generator, callback));
  }
  // Forward to next yield
  forward() {
    return this.stack[this.stack.length - 1].next();
  }
  // Atom data generator
  *atomGenerator(what, callback) {
    let generator, iterator;
    if (typeof what === 'function') {
      generator = what;
      iterator = generator();
    } else {
      iterator = what;
    }
    let result;
    // Generate all required atom to create a frame
    while (true) {
      let { done, value } = iterator.next(result);
      // A frame created, so break the "while" loop
      if (done) {
        result = value;
        break;
      }
      // Check required atom type and generate it
      switch (typeof value) {
        // Usage 1: Read until terminator string
        case 'string': {
          let terminator = matchString(value);
          let receiver = [];
          result = void 0;
          while (!result) {
            while (this.buffer.length <= this.position) yield 'next';
            let byte = this.buffer[this.position++];
            receiver.push(byte);
            if (terminator.next(byte).done) result = Buffer(receiver);
          }
          break;
        }
        // Usage 2: Read a known length
        case 'number': {
          while (this.buffer.length - this.position < value) yield 'next';
          result = this.buffer.slice(this.position, this.position + value);
          this.position += value;
          break;
        }
        case 'object': {
          switch (true) {
            // Usage 3: Read with sub-frame-generator
            case typeof value.next === 'function': {
              let directly = true;
              this.begin(value, subFrame => {
                result = subFrame;
                if (!directly) this.forward();
              });
              let it = this.forward();
              directly = it.done;
              if (!directly) yield it.value;
              break;
            }
            // Usage 4: Read until any specified string
            case value instanceof Array: {
              let terminators = value.map(string => matchString(string));
              let receiver = [];
              result = void 0;
              while (!result) {
                while (this.buffer.length <= this.position) yield 'next';
                let byte = this.buffer[this.position++];
                receiver.push(byte);
                for (let terminator of terminators) {
                  let { done, value } = terminator.next(byte);
                  if (!done) continue;
                  result = [ new Buffer(receiver.slice(0, -value.length)), new Buffer(receiver.slice(-value.length)) ];
                  break;
                }
              }
              break;
            }
          }
          break;
        }
        default:
          throw new Error(`FrameGenerator: Unknown yield format "${typeof value}"`);
      }
    }
    this.stack.pop();
    callback(result);
    return generator;
  }
  // Stream input event, resume the "resolver"
  _write(buffer, enc, next) {
    this.buffer = Buffer.concat([ this.buffer.slice(this.position), buffer ]);
    this.position = 0;
    while (true) {
      let { done, value } = this.forward();
      if (done) {
        if (!value && !this.stack.length) value = this.generator;
        if (value) this.begin(value);
      } else {
        if (value === 'next') next();
        break;
      }
    }
  }
}

module.exports = FrameGenerator;
