const { Transform } = require('stream');

class FrameGenerator extends Transform {
  constructor(generator) {
    super({ readableObjectMode : true });
    this.position = 0;
    this.buffer = new Buffer(0);
    this.stack = [];
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
          let terminator = new Buffer(value);
          let lastIndex = 0;
          let receiver = [];
          while (true) {
            while (this.buffer.length <= this.position) yield this.next();
            let byte = this.buffer[this.position++];
            receiver.push(byte);
            if (byte === terminator[lastIndex]) {
              if (lastIndex + 1 >= terminator.length) {
                result = new Buffer(receiver);
                break;
              } else {
                lastIndex++;
              }
            } else {
              lastIndex = 0;
            }
          }
          break;
        }
        // Usage 2: Read a known length
        case 'number': {
          while (this.buffer.length - this.position < value) yield this.next();
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
              directly = this.forward().done;
              if (!directly) yield void 0;
              break;
            }
            // Usage 4: Read until any specified string
            case value instanceof Array: {
              let { length } = value;
              let terminators = value.map(string => new Buffer(string));
              let lastIndexes = new Uint16Array(length);
              let receiver = [];
              result = void 0;
              while (true) {
                while (this.buffer.length <= this.position) yield this.next();
                let byte = this.buffer[this.position++];
                receiver.push(byte);
                for (let i = 0; i < length; i++) {
                  if (byte === terminators[i][lastIndexes[i]]) {
                    let patternLength = terminators[i].length;
                    if (lastIndexes[i] + 1 >= patternLength) {
                      result = [
                        new Buffer(receiver.slice(0, -patternLength)),
                        new Buffer(receiver.slice(-patternLength))
                      ]
                      break;
                    } else {
                      lastIndexes[i]++;
                    }
                  } else {
                    lastIndexes[i] = 0;
                  }
                }
                if (result) break;
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
    this.next = next;
    while (true) {
      let { done, value } = this.forward();
      if (done && value) {
        this.begin(value);
      } else {
        break;
      }
    }
  }
}

module.exports = FrameGenerator;
