## FrameGenerator

Transform Binary Readable Stream to Object Stream through Generator

#### Example

```js
// test.js

const FrameGenerator = require('FrameGenerator');

const Byte = {
  length: 1,
  read: (buffer, index) => buffer[index]
};

const gen = new FrameGenerator(function*() {
  let result = [];
  // Read until \n
  while (true) {
    let byte = yield Byte;
    if (byte === 10) break;
    result.push(byte);
  }
  return [ String.fromCharCode(...result) ];
});

process.stdin.pipe(gen).on('data', data => {
  console.log(data);
});
```

```sh
ping 127.0.0.1 | node test.js
```
