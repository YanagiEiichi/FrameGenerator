## FrameGenerator

Transform Binary Stream to Object Stream through Generator

It's suitable for parsing protocol from binary stream

### Require

node > 6

### Usage

```js
const FrameGenerator = require('FrameGenerator');

let fg = new FrameGenerator(function*() {
  let buffer1 = yield length; // Read a known length
  let buffer2 = yield terminator; // Read until terminator string
  let buffer3 = yield subFrame(); // Read a sub-frame that defined with a Generator
  return { buffer1, buffer2, buffer3 }; // Return and write to outputStream
});

inputStream.pipe(fg).pipe(outputStream)
```
