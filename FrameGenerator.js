const { Transform } = require('stream');

const matchString = what => {
  let terminator = new Buffer(what);
  let index = 0;
  return byte => {
    if (byte === terminator[index]) {
      if (index + 1 >= terminator.length) {
        return terminator;
      } else {
        index++;
      }
    } else {
      index = 0;
    }
  };
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
  readBytes(value) {
    if (this.buffer.length - this.position < value) return void 0;
    let result = this.buffer.slice(this.position, this.position + value);
    this.position += value;
    return result;
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
          let match = matchString(value);
          let receiver = [];
          result = void 0;
          while (!result) {
            while (this.buffer.length <= this.position) yield 'next';
            let byte = this.buffer[this.position++];
            receiver.push(byte);
            if (match(byte)) result = Buffer(receiver);
          }
          break;
        }
        // Usage 2: Read a known length
        case 'number': {
          while (!(result = this.readBytes(value))) yield 'next';
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
                for (let match of terminators) {
                  let value = match(byte);
                  if (!value) continue;
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
    try {
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
    } catch (error) {
      this.emit('error', error);
      this.push(null);
    }
  }
}

module.exports = FrameGenerator;
