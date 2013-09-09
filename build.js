
  // build.js
  // by joates (Sep-2013)

  var fs = require('fs')
    , ws = fs.createWriteStream('./public/bundle.js')
    , browserify = require('browserify')
    , b = browserify()

  // locate plugins.
  var re = new RegExp('^n3d.*$')
    , plugins = fs.readdirSync('./node_modules').filter(function(n){return re.test(n)})

  if (plugins.length) {
    var stream = fs.createWriteStream('./src/client/plugins.js')
    stream.once('open', function(fd) {
      stream.write('var plugins = {}\n')
      for (var i in plugins) {
        if (require(plugins[i]).client !== undefined) {
          var pName = plugins[i].substring(4)
          b.require(plugins[i], {expose: pName})
          stream.write('plugins.'+pName+' = {}\n')
          stream.write('plugins.'+pName+'.client  = require("'+pName+'").client\n')
          stream.write('plugins.'+pName+'.options = require("'+pName+'").options\n')
          stream.write('plugins.'+pName+'.weight  = '+(require(plugins[i]).weight||0)+'\n')
        }
      }
      stream.write('module.exports = plugins')
      stream.end()
    })
  }

  // add the core code & write output.
  b.add('./src/client/main.js')
  b.bundle().pipe(ws)

