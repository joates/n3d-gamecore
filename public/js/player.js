
  /**
   *  The player class
   *
   *  A simple class to maintain state of a player on screen,
   *  as well as to draw that state when required.
   */

  var game_player = function(game_instance, player_instance) {

    // Store the instance, if any
    this.instance = player_instance
    this.game = game_instance
    this.index = Math.random() < 0.5 ? 0 : 1

    // Set up initial values for our state information
    this.pos = { x:0, y:0, z:0 }
    this.ghostpos = { x:0, y:0, z:0 }
    this.destpos  = { x:0, y:0, z:0 }
    this.size = { radius:6, infoX:3, infoZ:3 }
    this.state = 'white'
    this.color = 'rgba(240,240,240,1.0)'
    this.color_2d = 'rgba(240,240,240,1.0)'
    this.info_color = 'rgba(220,240,220,0.8)'

    // These are used in moving us around later
    this.old_state = { pos: { x:0, y:0, z:0 } }
    this.cur_state = { pos: { x:0, y:0, z:0 } }  // spawn here!
    this.state_time = new Date().getTime()

    // Our local history of inputs
    this.inputs = []

    // The world bounds we are confined to
    // TODO: collisions are not implemented yet !!
    /**
    this.pos_limits = {
      x_min: this.size.hx,
      x_max: this.game.world.width - this.size.hx,
      y_min: this.size.hy,
      y_max: this.game.world.height - this.size.hy,
      z_min: this.size.hz,
      z_max: this.game.world.depth - this.size.hz
    }
    */
  }

  //

  game_player.prototype.render_2d = function(opts) {
    var half_map_width  = game.viewport.width  * 0.5
      , half_map_height = game.viewport.height * 0.5
      , map_scale = 0.11
      , target = {}

    if (opts.lerp) {
      game.ctx.fillStyle = 'rgba(255,255,255,0.2)'
      target.pos = this.destpos
    } else if (opts.ghost) {
      game.ctx.fillStyle = 'rgba(255,255,255,0.4)'
      target.pos = this.ghostpos
    } else {
      game.ctx.fillStyle = this.color_2d
      target.pos = this.pos
    }

    // Draw a filled circle
    game.ctx.beginPath()
    game.ctx.arc(
      ((target.pos.x - opts.pos.x) * map_scale) + half_map_width - this.size.radius,
      ((target.pos.z - opts.pos.z) * map_scale) + half_map_height - this.size.radius,
        this.size.radius,
        0,
        Math.PI * 2,
        true
    )
    game.ctx.closePath()
    game.ctx.fill()

    if (opts.player || ! (opts.lerp && opts.ghost)) {
      // Draw a status update
      game.ctx.fillStyle = this.info_color
      game.ctx.fillText(
          this.state,
        ((this.pos.x - opts.pos.x) * map_scale) + half_map_width + this.size.infoX,
        ((this.pos.z - opts.pos.z) * map_scale) + half_map_height - this.size.infoZ
      )
    }
  }

  //

  game_player.prototype.setrandomcolor = function() {
    // give this player some random color
    this.color = '#' + Math.floor(Math.random() * 16777215).toString(16)
  }

  //

  game_player.prototype.resetpos = function(mypos) {

    // copies a 2d vector like object from one to another
    var newpos = function(a) { return { x:a.x, y:a.y, z:a.z} }
    this.pos = newpos(mypos)
    this.old_state.pos = newpos(mypos)
    this.cur_state.pos = newpos(mypos)
    this.ghostpos = newpos(mypos)
    this.destpos = newpos(mypos)
  }

  //

  // server side we set the 'game_player' class to a global type,
  // so that it can use it anywhere.
  if ('undefined' != typeof global) {
    module.exports = global.game_player = game_player
  }

