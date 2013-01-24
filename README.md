# Ultraproxy

ultraproxy is a small and simple agressively caching proxy. 
It is horribly standards non-compliant and will most likely break lots of 
things. Do not use it if you don't know what you're doing!

ultraproxy.js is meant for offline replay of simple web content. I 
developed it for use with my HTML based presentation framework jSlide to 
show off online content on my offline presentation laptop.

```js
// install
npm install -g ultraproxy

// start proxy on port 8080
ultraproxy 8080
```

Ultraproxy will create a ```cache``` directory below the current directory.
Ultraproxy respects the HTTP_PROXY environment variable and redirects 
traffic appropriately.
