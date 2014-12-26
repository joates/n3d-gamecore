
  //  game.js
  //  by joates (Aug-2013)

      var game_server = require('./src/server/registry.js')
        , express = require('express')
        , http    = require('http')
        , io      = require('socket.io')
        , color   = require('./src/server/ansi-color')
        , uuid    = require('node-uuid')
      //, geoip   = require('geoip-lite')
        , app     = express()

      var port = process.env.PORT || 8000
      app.use(express.favicon())
      app.use(express.static(__dirname + '/public'))

      app.log = function() {
        var d = new Date()
          , dTime = d.toTimeString().substr(0, 8)
          , aArgs = [ arguments[0] + '  ' + dTime ]
        console.log.apply(this, aArgs)
      }

      var server = http.createServer(app).listen(port, function() {
        console.log('   Express server listening on port ' + port)
        console.log('   ' + Array(49).join('_'))
      })

  //
  //  Socket.IO server set up & configuration.

      var sio = io.listen(server)

      sio.configure(function () {
        sio.set('log level', 0)
        sio.set('authorization', function (handshakeData, callback) {
          callback(null, true)   // error first callback style
        })
      })

  //  Register event handlers & callbacks.

      sio.sockets.on('connection', function (client) {

        // Generate a unique identifier
        client.uuid = uuid.v1({ rng: uuid.nodeRNG })

        // TODO: Geo-locate the client.
        client.ip  = client.handshake.address.address
        client.geo = { country: 'EE' }
        if (client.ip !== '127.0.0.1') {
          //client.geo = geoip.lookup(client.ip)
        }

        // Tell the player they connected and the uuid
        client.emit('onconnected', { id: client.uuid })

        // Connect to a game instance.
        game_server.join_game(client)

        // Log the new client connection.
        app.log('   User join:  '  + client.uuid + '-' + client.geo.country)

        client.on('message', function(msg) {
            game_server.onMessage(client, msg)
        })

        client.on('disconnect', function() {

          // Log notification that a client disconnected.
          app.log(
            '   User quit:  ' + color.yellow + client.uuid +
            color.reset + '-' + client.geo.country
          )

          // Client (and player) leave the game.
          if (client.game && client.game.uuid) {
            game_server.leave_game(client.game.uuid, client.uuid)
          }
        })
      })

