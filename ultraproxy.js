var http = require('http')
  , url = require('url')
  , fs = require('fs')
  , path = require('path')
  , crypto = require('crypto')
  , useProxy, envProxy = process.env.HTTP_PROXY || process.env.http_proxy, pEnvProxy
  , dir = 'cache'
;

// respect HTTP_PROXY environment variable
function hostPort(host) {
  if(!/^http:\/\//.test(host)) { host = 'http://'+host; }
  return url.parse(host);
}
if(useProxy = !!envProxy) {
  pEnvProxy = hostPort(envProxy);
  console.log( "Using proxy", pEnvProxy.port, pEnvProxy.hostname );
}

// make sure cache directory exists
function makeDirectory(dir) {
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
}
makeDirectory(dir);

http.createServer(function(request, response) {
  var proxy, proxy_request
    , md5 = crypto.createHash('md5')
    , requestdata = { m:request.method, u:request.url, h:{} }
    , hash, sdir, file, cache = { chunks: [] }
    , i
  ;

  // deep copy headers
  for( key in request.headers ) {
    requestdata.h[key] = request.headers[key];
  }

  // improve cacheing by removing certain headers
  //delete requestdata.h['user-agent'];
  //delete requestdata.h['referer'];
  //delete requestdata.h['cookie'];
  
  md5.update( JSON.stringify(requestdata) );
  hash = md5.digest('hex');
  sdir = dir+'/'+hash.substring(0,2);
  makeDirectory(sdir);
  file = sdir+'/'+hash;

  //console.log("hash is",hash);
  //console.log(request);

  function cacheMiss() {
    var hp = hostPort(requestdata.h.host)
      , options = {
          host: useProxy ? pEnvProxy.hostname : hp.hostname,
          port: useProxy ? pEnvProxy.port     : (hp.port||80),
          path: useProxy ? request.url        : hostPort(request.url).path,
          headers: request.headers,
          method: request.method
        }
      ;
    
    console.log("cache miss ", request.url );
    //  console.log(request); 
    //console.log(options);
    
    proxy_request = http.request(options, function(res) {
      var fd = fs.openSync( file+'.data', 'w');

      response.writeHead( res.statusCode, res.headers);
      //console.log(res.statusCode, res.headers);

      res.on('data', function(chunk) {
        // write binary response date to disk
        fs.write(fd, chunk, 0, chunk.length );
        // pass response through to client
        response.write(chunk, 'binary');
      });
      res.on('end', function() {
        response.end();
        fs.close(fd);
      });

      // write headers and status as separate JSON file (TODO, do not cache 404 etc.?)
      //if( res.statusCode == 200 ) {
        fs.writeFile( file+'.head', JSON.stringify( { statusCode: res.statusCode, headers: res.headers, url: request.url } ), function(err) {
          if(err) { console.log(err); }
        });
      //}
    });

    proxy_request.on('error', function(err) {
      console.error('Problem with the request %s',err);
    });
    
    // oh, that data should probably go into the hash as well
    request.on('data', function(chunk) {
      proxy_request.write(chunk, 'binary');
    });
    request.on('end', function() {
      proxy_request.end();
    });
  }

  if( !( path.existsSync(file+'.data') &&  
         path.existsSync(file+'.head') ) ) {
    // file is not cached yet
    cacheMiss();
  } else {
    // retrieve cache object
    fs.readFile( file+'.head', 'ascii', function(err,data) {
      if(err) {
        console.error("Could not open file: %s", err);
        process.exit(1);
      }
      console.log("cache hit! ", request.url );
      try {
        cache = JSON.parse(data);
      } catch(e) {
        // invalid cache
        cacheMiss();
      }
      response.writeHead(cache.statusCode, cache.headers);
      
      var read_stream = fs.createReadStream(file+'.data');
      read_stream.on("data", function(data){
        response.write(data, 'binary');
      });
      read_stream.on("error", function(err){
        console.error("An error occurred: %s", err)
        response.end();
      });
      read_stream.on("close", function(){
        response.end();
      });
    });
  }
}).listen(13457);
