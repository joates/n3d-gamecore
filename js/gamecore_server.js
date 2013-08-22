
  // gamecore_server.js
  // by joates (Aug-2013)

  /**
   *  Copyright (c) 2013 Asad Memon
   *  Forked and updated.
   *
   *  MIT Licensed.
   */

  /**
   *  Copyright (c) 2012 Sven "FuzzYspo0N" Bergström
   *  written by : http://underscorediscovery.com
   *  written for : http://buildnewgames.com/real-time-multiplayer/
   *
   *  MIT Licensed.
   */


  //  The main update loop runs on requestAnimationFrame,
  //  Which falls back to a setTimeout loop on the server
  //  Code below is from Three.js, and sourced from links below

  //  http://paulirish.com/2011/requestanimationframe-for-smart-animating/
  //  http://my.opera.com/emoller/blog/2011/12/20/requestanimationframe-for-smart-er-animating

  //  requestAnimationFrame polyfill by Erik Möller
  //  fixes from Paul Irish and Tino Zijdel

  var frame_time = 60 / 1000  // run the local game at 16ms/ 60hz
  if ('undefined' != typeof(global)) frame_time = 45  //on server we run at 45ms, 22hz

  ;(function() {

    var lastTime = 0
    var vendors = [ 'ms', 'moz', 'webkit', 'o' ]

    for (var x=0; x<vendors.length && ! window.requestAnimationFrame; ++x) {
      window.requestAnimationFrame = window[ vendors[x] + 'RequestAnimationFrame' ]
      window.cancelAnimationFrame = window[ vendors[x] + 'CancelAnimationFrame' ] || window[ vendors[x] + 'CancelRequestAnimationFrame' ]
    }

    if (! window.requestAnimationFrame) {
      window.requestAnimationFrame = function (callback, element) {
        var currTime = Date.now(), timeToCall = Math.max(0, frame_time - (currTime - lastTime))
        var id = window.setTimeout(function() { callback(currTime + timeToCall) }, timeToCall)
        lastTime = currTime + timeToCall
        return id
      }
    }

    if (! window.cancelAnimationFrame) {
      window.cancelAnimationFrame = function (id) { clearTimeout(id) }
    }

  }() )


  // load the shared player class
  require('./player.js')

  //  The game_core class

      var game_core = function(game_instance) {

        //Store the instance, if any
        this.instance = game_instance
        //Store a flag if we are the server
        this.server = this.instance !== undefined

        // TODO: collision not implemented yet !
        // Used in collision etc.
        /**
        this.world = {
            width:  800,
            height: 800,
            depth:  800
        }
        */

        // issue #2
        this.player_manifest = {}

        this.allplayers = []

        // issue #2
        //this.allplayers.push(new game_player(this, this.instance.player_host))
        //this.allplayers[0].idingame = this.playercount

        // The speed at which the clients move.
        this.playerspeed = 120
        this.playercount = 0  // used for player's gameid within this game.

        // Set up some physics integration values
        this._pdt  = 0.0001                 //The physics update delta time
        this._pdte = new Date().getTime()   //The physics update last delta time
        // A local timer for precision on server and client
        this.local_time = 0.016             //The local timer
        this._dt  = new Date().getTime()    //The local timer delta
        this._dte = new Date().getTime()    //The local timer last frame time

        // Start a physics loop, this is separate to the rendering
        // as this happens at a fixed frequency
        this.create_physics_simulation()

        // Start a fast paced timer for measuring time easier
        this.create_timer()


        this.server_time = 0
        this.laststate = {}
      }

  //

      // server side we set the 'game_core' class to a global type, so that it can use it anywhere.
      if ('undefined' != typeof global) module.exports = global.game_core = game_core

  //

  /**
   *  Helper functions for the game code
   *
   *  Here we have some common maths and game related code to make working with 2d vectors easy,
   *  as well as some helpers for rounding numbers to fixed point.
   */

      // (4.22208334636).fixed(n) will return fixed point value to n places, default n = 3
      Number.prototype.fixed = function(n) { n = n || 3; return parseFloat(this.toFixed(n)) }
      // copies a 2d vector like object from one to another
      game_core.prototype.pos = function(a) { return { x:a.x, y:a.y, z:a.z } }
      // Add a 2d vector with another one and return the resulting vector
      game_core.prototype.v_add = function(a, b) { return { x:(a.x + b.x).fixed(), y:(a.y + b.y).fixed(), z:(a.z + b.z).fixed() } }
      // Subtract a 2d vector with another one and return the resulting vector
      game_core.prototype.v_sub = function(a, b) { return { x:(a.x - b.x).fixed(), y:(a.y - b.y).fixed(), z:(a.z - b.z).fixed() } }
      // Multiply a 2d vector with a scalar value and return the resulting vector
      game_core.prototype.v_mul_scalar = function(a, b) { return { x:(a.x * b).fixed(), y:(a.y * b).fixed(), z:(a.z * b).fixed() } }
      // For the server, we need to cancel the setTimeout that the polyfill creates
      game_core.prototype.stop_update = function() { window.cancelAnimationFrame(this.updateid) }
      // Simple linear interpolation
      game_core.prototype.lerp = function(p, n, t) { var _t = Number(t); _t = (Math.max(0, Math.min(1, _t))).fixed(); return (p + _t * (n - p)).fixed() }
      // Simple linear interpolation between 2 vectors
      game_core.prototype.v_lerp = function(v, tv, t) { return { x:this.lerp(v.x, tv.x, t), y:this.lerp(v.y, tv.y, t), z:this.lerp(v.z, tv.z, t) } }


  /**
   *  Common functions
   *
   *  These functions are shared between client and server, and are generic
   *  for the game state. The client functions are client_* and server functions
   *  are server_* so these have no prefix.
   */

  //  Main update loop

      game_core.prototype.update = function(t) {

        // Work out the delta time
        this.dt = this.lastframetime ? ((t - this.lastframetime) / 1000.0).fixed() : 0.016

        // Store the last frame time
        this.lastframetime = t

        // Update the game specifics
        this.server_update()

        // schedule the next update
        this.updateid = window.requestAnimationFrame(this.update.bind(this), this.viewport)
      }


  /**
   *  Shared between server and client.
   *  In this example, `item` is always of type game_player.
   */

      game_core.prototype.check_collision = function(item) {

        // TODO: collisions not implemented yet !
        /**
        // left
        if (item.pos.x <= item.pos_limits.x_min) {
          item.pos.x = item.pos_limits.x_min
        }

        // right
        if (item.pos.x >= item.pos_limits.x_max) {
          item.pos.x = item.pos_limits.x_max
        }
    
        // floor
        if (item.pos.y <= item.pos_limits.y_min) {
          item.pos.y = item.pos_limits.y_min
        }

        // top
        if (item.pos.y >= item.pos_limits.y_max) {
          item.pos.y = item.pos_limits.y_max
        }

        // front
        if (item.pos.z <= item.pos_limits.z_min) {
          item.pos.z = item.pos_limits.z_min
        }

        // back
        if (item.pos.z >= item.pos_limits.z_max) {
          item.pos.z = item.pos_limits.z_max
        }

        // Fixed point helps be more deterministic
        item.pos.x = item.pos.x.fixed(4)
        item.pos.y = item.pos.y.fixed(4)
        item.pos.z = item.pos.z.fixed(4)
        */
      }

  //

      game_core.prototype.process_input = function(player) {

        // It's possible to have recieved multiple inputs by now,
        // so we process each one
        var x_dir = 0
        var y_dir = 0
        var z_dir = 0

        var ic = player.inputs.length
        if (ic) {
          for (var j=0; j<ic; ++j) {
            // don't process ones we already have simulated locally
            if (player.inputs[j].seq <= player.last_input_seq) continue

            var input = player.inputs[j].inputs
            var c = input.length

            for (var i=0; i<c; i+=2) {
              x_dir = input[i]
              z_dir = input[i + 1]
            }
          }
        }

        // we have a direction vector now, so apply the same physics as the client
        var resulting_vector = this.physics_movement_vector_from_direction(x_dir, y_dir, z_dir)
        if (player.inputs.length) {
          // we can now clear the array since these have been processed
          player.last_input_time = player.inputs[ic - 1].time
          player.last_input_seq  = player.inputs[ic - 1].seq
        }

        // give it back
        return resulting_vector
      }

  //

      game_core.prototype.physics_movement_vector_from_direction = function(x, y, z) {

        // Must be fixed step, at physics sync speed.
        return {
          x: (x * (this.playerspeed * 0.015)).fixed(3),
          y: (y * (this.playerspeed * 0.015)).fixed(3),
          z: (z * (this.playerspeed * 0.015)).fixed(3)
        }
      }

  //

      game_core.prototype.update_physics = function() {
        this.server_update_physics()
      }

  //

      game_core.prototype.server_update_physics = function() {

        for (var i=0, l=this.allplayers.length; i<l; i++) {
          // handle players
          this.allplayers[i].old_state.pos = this.pos(this.allplayers[i].pos)
          var new_dir = this.process_input(this.allplayers[i])
          this.allplayers[i].pos = this.v_add(this.allplayers[i].old_state.pos, new_dir)

          // TODO: collisions are ignored for now !
          // Keep the physics position in the world
          //this.check_collision(this.allplayers[i])

          // clear buffer
          this.allplayers[i].inputs = []
        }
      }

  //

      game_core.prototype.server_update = function() {

        // Update the state of our local clock to match the timer
        this.server_time = this.local_time

        // Make a snapshot of the current state, for updating the clients
        var allpos = new Array()
        for (var i=0, l=this.allplayers.length; i<l; i++) {  // concat all clients pos from our players array
          //console.log(this.allplayers[i].last_input_seq)
          var vals = { pos: this.allplayers[i].pos, isq: this.allplayers[i].last_input_seq }
          allpos[this.allplayers[i].index] = vals
        }

        this.laststate = {
          //pc: this.playercount,       // player count
          vals: allpos,                 // all positions and inpseq
          t:    this.server_time        // our current local time on the server
        }

        for (var i=0, l=this.allplayers.length; i<l; i++) {
          // this users array index to be sent too. (for parsing data accordingly)
          this.laststate.myi = this.allplayers[i].index
          // Send the snapshot to the player
          if (this.allplayers[i].instance) {
            this.allplayers[i].instance.emit('onserverupdate', this.laststate)
          }
        }
      }

  //

      game_core.prototype.handle_server_input = function(client, input, input_time, input_seq) {

        // Fetch which client this refers
        var player_client = null
        for (var i=0, l=this.allplayers.length; i<l; i++) {
          if (client.uuid == this.allplayers[i].instance.uuid) {
            player_client = this.allplayers[i]
            break
          }
        }

        if (player_client && player_client.inputs) {
          if (input.length) {
            // convert string input values back into numeric data
            for (var i=0, l=input.length; i<l; i++) {
              //input[i] = parseInt(input[i].replace(',', '.'))
              input[i] = parseFloat(input[i].replace(',', '.'))
            }

            // Store the input on the player instance for processing in the physics loop
            player_client.inputs.push({ inputs: input, time: input_time, seq: input_seq })
          }
        }
      }

  //

      game_core.prototype.create_timer = function() {
        setInterval(function() {
          this._dt  = new Date().getTime() - this._dte
          this._dte = new Date().getTime()
          this.local_time += this._dt / 1000.0
        }.bind(this), 4)
      }

  //

      game_core.prototype.create_physics_simulation = function() {
        setInterval(function() {
          this._pdt = (new Date().getTime() - this._pdte) / 1000.0
          this._pdte = new Date().getTime()
          this.update_physics()
        }.bind(this), 15)
      }

  //

      game_core.prototype.player_connect = function(player) {
        // someone entered the game, add them to our list !
        this.playercount++
        var p = new game_player(this, player)
        this.allplayers.push(p)
        this.allplayers[this.allplayers.length - 1].index = this.playercount

        // issue #2
        this.player_manifest[player.uuid] = p
        //console.dir(this.player_manifest)
      }

  //

      game_core.prototype.player_disconnect = function(uuid) {
        // someone quit the game, delete them from our list !

        for (var i = this.allplayers.length - 1; i>=0; i--) {
          //console.log(i+"# "+this.allplayers[i].instance.uuid)
          if (this.allplayers[i].instance.uuid == uuid) {
            this.allplayers.splice(i, 1)
            break
          }
          this.allplayers.filter(function(a) { return typeof a !== 'undefined' })
        }

        // issue #2
        delete this.player_manifest[uuid]
      }
