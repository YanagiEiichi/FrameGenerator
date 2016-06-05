const net = require('net');
const FrameGenerator = require('../FrameGenerator');

net.createServer(socket => {

  socket.pipe(new FrameGenerator(function*() {

    let headline = String(yield '\r\n');
    let [ method, path, version ] = headline.match(/\S+/g);

    let headers = {};
    while (true) {
      header = String(yield '\r\n');
      if (header === '\r\n') break;
      let [ name, value ] = header.split(':');
      headers[name.toLowerCase()] = value.replace(/^\s*|\s*$/g, '');
    }

    let payload;
    let length = +headers['content-length'];
    if (length) {
      payload = yield length;
      if (headers['content-type'] === 'application/x-www-form-urlencoded') payload += '';
    }

    return { method, path, version, headers, payload };

  })).on('data', data => {
    console.log(data);
    socket.write([
      data.version + ' 200 OK',
      'Content-Length: ' + data.payload.length
    ].join('\r\n') + '\r\n\r\n');
    socket.write(data.payload);
  });

}).listen(8000);
