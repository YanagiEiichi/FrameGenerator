const FrameGenerator = require('../FrameGenerator');

process.stdin.pipe(new FrameGenerator(function*() {
  // Read until "\n"
  return String(yield '\n').replace(/time=\S*/, '[32m$&[0m');
})).pipe(process.stdout);
