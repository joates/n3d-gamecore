
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
    this.index = game_instance.playercount || 1

    // Set up initial values for our state information
    this.pos = { x:0, y:0, z:0 }
    this.ghostpos = { x:0, y:0, z:0 }
    this.destpos  = { x:0, y:0, z:0 }
    this.size = { x:16, y:16, z:16, hx:8, hy:8, hz:8 }
    this.state = 'not-connected'
    this.color = 'rgba(240,240,240,0.8)'
    this.info_color = 'rgba(220,240,220,0.8)'

    // These are used in moving us around later
    this.old_state = { pos: { x:0, y:0, z:0 } }
    this.cur_state = { pos: { x:0, y:0, z:0 } }  // spawn here!
    this.state_time = new Date().getTime()

    // Our local history of inputs
    this.inputs = []

    // The world bounds we are confined to
    // TODO: collisions are not defined yet !!
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

    // issue #2
    /**
    // The 'host' of a game gets created with a player instance since
    // the server already knows who they are. If the server starts a game
    // with only a host, the other player is set up in the 'else' below
    if (player_instance) {
      this.pos = { x:0, y:0, z:0 }
    } else {
      // not sure why, but..
      // players lerp from this position when they are reset ??
      this.pos = { x:-100, y:0, z:-100 }
    }
    */

  }

  //
  
  game_player.prototype.draw = function(offset_pos) {

    // updated to display only other players in 2D
    // relative to the location of 'this.selfplayer'

    var half_map_width  = game.viewport.width  * 0.5
      , half_map_height = game.viewport.height * 0.5
      , map_scale = 0.11

    // Set the color for this player
    game.ctx.fillStyle = this.color

    // Draw a rectangle for us
    game.ctx.fillRect(
      ((this.pos.x - offset_pos.x) * map_scale) + half_map_width - this.size.hx,
      ((this.pos.z - offset_pos.z) * map_scale) + half_map_height - this.size.hz,
        this.size.x,
        this.size.z
    )

    // Draw a status update
    game.ctx.fillStyle = this.info_color
    game.ctx.fillText(
        this.state,
      ((this.pos.x - offset_pos.x) * map_scale) + half_map_width + 10,
      ((this.pos.z - offset_pos.z) * map_scale) + half_map_height + 4
    )
  }

  //

  game_player.prototype.drawserverghost = function(offset_pos) {

    // updated to display only other players in 2D
    // relative to the location of 'this.selfplayer'

    var half_map_width  = game.viewport.width  * 0.5
      , half_map_height = game.viewport.height * 0.5
      , map_scale = 0.11

    // Set the color for this player ghost
    game.ctx.fillStyle = 'rgba(255,255,255,0.2)'

    // Draw a rectangle for us
    game.ctx.fillRect(
      ((this.ghostpos.x - offset_pos.x) * map_scale) + half_map_width - this.size.hx,
      ((this.ghostpos.z - offset_pos.Z) * map_scale) + half_map_height - this.size.hz,
        this.size.x,
        this.size.z
    )

    // Draw a status update
    game.ctx.fillStyle = this.info_color
    game.ctx.fillText(
       'server_pos',
      ((this.ghostpos.x - offset_pos.x) * map_scale) + half_map_width + 10,
      ((this.ghostpos.z - offset_pos.z) * map_scale) + half_map_height + 4
    )
  }

  //

  game_player.prototype.drawdestghost = function(offset_pos) {

    // updated to display only other players in 2D
    // relative to the location of 'this.selfplayer'

    var half_map_width  = game.viewport.width  * 0.5
      , half_map_height = game.viewport.height * 0.5
      , map_scale = 0.11

    // Set the color for this player ghost
    game.ctx.fillStyle = 'rgba(255,255,255,0.1)'

    // Draw a rectangle for us
    game.ctx.fillRect(
      ((this.destpos.x - offset_pos.x) * map_scale) + half_map_width - this.size.hx,
      ((this.destpos.z - offset_pos.z) * map_scale) + half_map_height - this.size.hz,
        this.size.x,
        this.size.z
    )


    // Draw a status update
    game.ctx.fillStyle = this.info_color
    game.ctx.fillText(
       'dest_pos',
      ((this.destpos.x - offset_pos.x) * map_scale) + half_map_width + 10,
      ((this.destpos.z - offset_pos.z) * map_scale) + half_map_height + 4
    )
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

  // server side we set the 'game_core' class to a global type,
  // so that it can use it anywhere.
  if ('undefined' != typeof global) {
    module.exports = global.game_player = game_player
  }

