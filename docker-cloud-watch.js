require('babel-register')

var getServices = require('./lib/etcd-watch').default
var reloadNginx = require("./lib/reload-nginx").default

getServices(reloadNginx)

setInterval(function() {
  getServices(reloadNginx)
}, process.env.NGINX_REFRESH || 5000)

console.log("Watching Etcd for Changes")
