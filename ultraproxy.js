var http = require('http')
  , url = require('url')
  , fs = require('fs')
  , path = require('path')
  , crypto = require('crypto')
  , useProxy, envProxy = process.env.HTTP_PROXY || process.env.http_proxy, pEnvProxy
  , dir = 'cache'
;

// respect HTTP_PROXY environment variable
if(useProxy = !!envProxy) {
  if(!/^http:\/\//.test(envProxy)) { envProxy = 'http://'+envProxy; }
  pEnvProxy = url.parse(envProxy);
  console.log( "Using proxy", pEnvProxy.port, pEnvProxy.hostname );
}

// make sure cache directory exists
try {
  stats = fs.lstatSync(dir);
  if (!stats.isDirectory()) {
    console.log(dir,'already exists and is not a directory!');
    process.exit(1);
  }
}
catch (e) {
  console.log('creating cache directory',dir);
  fs.mkdir(dir);
}

http.createServer(function(request, response) {
  var proxy, proxy_request
    , md5 = crypto.createHash('md5')
    , requestdata = { m:request.method, u:request.url, h:{} }
    , hash, file, cache = { chunks: [] }
    , i
  ;

  // deep copy headers
  for( key in request.headers ) {
    requestdata.h[key] = request.headers[key];
  }

  // improve cacheing by removing certain headers
  delete requestdata.h['user-agent'];
  delete requestdata.h['referer'];
  delete requestdata.h['cookie'];
  
  md5.update( JSON.stringify(requestdata) );
  hash = md5.digest('hex');
  file = dir+'/'+hash;

  console.log("hash is",hash);
  console.log(requestdata);

  if( !path.existsSync(file) ) {
    // file is not cached yet
    if( useProxy ) {
      proxy = http.createClient( pEnvProxy.port, pEnvProxy.hostname )
    } else {
      proxy = http.createClient(80, request.headers['host'])
    }
    proxy_request = proxy.request(request.method, request.url, request.headers);

    proxy_request.addListener('response', function (proxy_response) {
      proxy_response.addListener('data', function(chunk) {
        cache.chunks.push( chunk.toString('base64') );
        response.write(chunk, 'binary');
      });
      proxy_response.addListener('end', function() {
        response.end();
        // save the serialized cache object to disk
        fs.writeFile( file, JSON.stringify(cache), function(err) {
          if(err) {
              console.log(err);
          } else {
              console.log("The file was saved!");
          }
        });
      });
      response.writeHead(proxy_response.statusCode, proxy_response.headers);

      // add headers and status to cache object (TODO, do not cache 404 etc.?)
      cache.statusCode = proxy_response.statusCode;
      cache.headers = proxy_response.headers;
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
    fs.readFile( file, 'ascii', function(err,data) {
      if(err) {
        console.error("Could not open file: %s", err);
        process.exit(1);
      }
      console.log('cache hit!');
      cache = JSON.parse(data);
      response.writeHead(cache.statusCode, cache.headers);
      for( i=0; i < cache.chunks.length; ++i ) {
        response.write( new Buffer(cache.chunks[i],'base64'), 'binary' );
      }
      response.end();
    });
  }
}).listen(13457);
