
  // main.js
  // by joates (Sep-2013)

  var Game    = require('./gamecore.js')
    , plugins = require('./plugins.js')
    , extend  = require('extend')

  game = new Game()

  // all plugins will initialise themselves when
  // the new game has completed it's own initialisation.
  game.on('init', function() {
    for (var id in plugins) {
      if (plugins[id] === undefined ||
          plugins[id].client === undefined) continue
      var plugin = plugins[id].client
      if (typeof plugin.init === 'function')
        // only initialise a valid plugin !
        plugin.init(game)
    }
  })

  // when the browser page is loaded we build the configuration
  // using exported options from each plugin and start the game.
  window.onload = function() {
    var rc = plugins.scene.options.renderContext()
    , options = { renderContext: rc }

    if (Object.keys(plugins).length > 1) {
      for (var id in plugins) {
        // TODO: sort plugins by weight.
        options = extend({}, options, plugins[id].options || {})
      }
    }

    game.start(options)
  }

