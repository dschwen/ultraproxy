var http = require('http')
  , fs = require('fs')
  , crypto = require('crypto')
;

http.createServer(function(request, response) {
  var proxy, proxy_request
    , md5 = crypto.createHash('md5')
    , requestdata = JSON.stringify( { m:request.method, u:request.url, h:request.headers } )
    , hash, cache = { chunks: [] }
    , i
  ;

  md5.update( requestdata );
  hash = md5.digest('hex');

  console.log("hash is",hash);
  console.log(requestdata);

  if( 1 ) {
    // file is not cached yet
    proxy = http.createClient(80, request.headers['host'])
    proxy_request = proxy.request(request.method, request.url, request.headers);

    proxy_request.addListener('response', function (proxy_response) {
      proxy_response.addListener('data', function(chunk) {
        cache.chunks.push( chunk.toString('base64') );
        response.write(chunk, 'binary');
      });
      proxy_response.addListener('end', function() {
        response.end();
        // save the serialized cache object to disk
        console.log( JSON.stringify(cache) );
      });
      response.writeHead(proxy_response.statusCode, proxy_response.headers);
    });
    
    // oh, that data should probably go into the hash as well
    request.addListener('data', function(chunk) {
      proxy_request.write(chunk, 'binary');
    });
    request.addListener('end', function() {
      proxy_request.end();
    });
  } else {
    // retrieve cache object
    for( i=0; i < cache.chunks.length; ++i ) {
      response.write( new Buffer(cache.chunks[i],'base64'), 'binary' );
    }
  }
}).listen(13457);
