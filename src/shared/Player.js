
  // Player.js
  // by joates (Sep-2013)

  var Player = function(game_instance, player_instance) {

    // Store the instance, if any
    this.instance = player_instance
    this.game = game_instance
    this.index = Math.random() < 0.5 ? 0 : 1

    // Set up initial values for our state information
    this.pos = { x:0, y:0, z:0 }
    this.ghostpos = { x:0, y:0, z:0 }
    this.destpos  = { x:0, y:0, z:0 }
    this.size = { radius:6, infoX:3, infoZ:3 }
    this.state = 'new player'
    this.color = 'rgba(240,240,240,1.0)'
    this.color_2d = 'rgba(240,240,240,1.0)'
    this.info_color = 'rgba(220,240,220,0.8)'

    // These are used in moving us around later
    this.old_state = { pos: { x:0, y:0, z:0 } }
    this.cur_state = { pos: { x:0, y:0, z:0 } }  // spawn here!
    this.state_time = new Date().getTime()

    // Our local history of inputs
    this.inputs = []
  }

  //

  Player.prototype.render_2d = function(opts, game_instance) {
    var half_map_width  = game_instance.viewport.width  * 0.5
      , half_map_height = game_instance.viewport.height * 0.5
      , map_scale = 0.11
      , target = {}

    if (opts.lerp) {
      game_instance.ctx.fillStyle = 'rgba(255,255,255,0.2)'
      target.pos = this.destpos
    } else if (opts.ghost) {
      game_instance.ctx.fillStyle = 'rgba(255,255,255,0.4)'
      target.pos = this.ghostpos
    } else {
      game_instance.ctx.fillStyle = this.color_2d
      target.pos = this.pos
    }

    // Draw a filled circle
    game_instance.ctx.beginPath()
    game_instance.ctx.arc(
      ((target.pos.x - opts.pos.x) * map_scale) + half_map_width - this.size.radius,
      ((target.pos.z - opts.pos.z) * map_scale) + half_map_height - this.size.radius,
        this.size.radius,
        0,
        Math.PI * 2,
        true
    )
    game_instance.ctx.closePath()
    game_instance.ctx.fill()

    if (opts.player || ! (opts.lerp && opts.ghost)) {
      // Draw a status update
      game_instance.ctx.fillStyle = this.info_color
      game_instance.ctx.fillText(
          this.state,
        ((this.pos.x - opts.pos.x) * map_scale) + half_map_width + this.size.infoX,
        ((this.pos.z - opts.pos.z) * map_scale) + half_map_height - this.size.infoZ
      )
    }
  }

  //

  module.exports = Player

