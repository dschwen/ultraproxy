var http = require('http')
  , crypto = require('crypto')
  , cache = {}
;

http.createServer(function(request, response) {
  var proxy, proxy_request
    , md5 = crypto.createHash('md5')
    , requestdata = JSON.stringify( { m:request.method, u:request.url, h:request.headers } )
    , hash
  ;

  md5.update( requestdata );
  hash = md5.digest('hex');

  console.log("hash is",hash);
  console.log(requestdata);
/*
  proxy = http.createClient(80, request.headers['host'])
  proxy_request = proxy.request(request.method, request.url, request.headers);
  proxy_request.addListener('response', function (proxy_response) {
    proxy_response.addListener('data', function(chunk) {
      response.write(chunk, 'binary');
    });
    proxy_response.addListener('end', function() {
      response.end();
    });
    response.writeHead(proxy_response.statusCode, proxy_response.headers);
  });
  request.addListener('data', function(chunk) {
    proxy_request.write(chunk, 'binary');
  });
  request.addListener('end', function() {
    proxy_request.end();
  });
  */
}).listen(13457);
