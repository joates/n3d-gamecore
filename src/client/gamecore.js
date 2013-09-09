
  // gamecore.js
  // by joates (Sep-2013)

  /**
   *  Copyright (c) 2012 Sven "FuzzYspo0N" Bergström
   *  written by:  http://underscorediscovery.com
   *  written for: http://buildnewgames.com/real-time-multiplayer/
   *
   *  MIT Licensed.
   */

  var EventEmitter = require('events').EventEmitter
    , Controller = require('n3d-controller')
    , domready = require('domready')
    , util   = require('util')
    , io     = require('socket.io-browserify')
    , Player = require('../shared/Player.js')
    , golden_ratio = 1.6180339887

  function game_core() {
    EventEmitter.call(this)

    this.player_self = new Player(this)
    this.player_set  = {}
    this.playerspeed = 90
    this.playercount = 0
    this.server_updates = []

    this._pdt  = 0.0001
    this._pdte = new Date().getTime()
    this.local_time = 0.016
    this._dt  = new Date().getTime()
    this._dte = new Date().getTime()
  }

  util.inherits(game_core, EventEmitter)
  require('../shared/common.js')(game_core)
  module.exports = game_core

  game_core.prototype.start = function(opts) {
    var self  = this
    this.opts = opts || {}

    this.create_physics_simulation()
    this.create_timer()
    this.client_create_configuration()

    //Connect to the socket.io server!
    this.client_connect_to_server()
    this.client_create_ping_timer()

    setTimeout(function() { domready(function() {

        // Make this only if requested
        if (String(window.location).indexOf('debug') != -1) {
          self.client_create_debug_gui()
        }

        // TODO: this should be handled by the plugin.

        // 2D viewport. (i.e. map)
        self.viewport = document.getElementById('viewport')
        self.viewport.width  = window.innerWidth * 0.25 - 20
        self.viewport.height = self.viewport.width / golden_ratio
        self.ctx = self.viewport.getContext('2d')
        self.ctx.font = '11px "Helvetica"'

        if (self.opts.renderTarget) {
          self.scene = self.opts.renderTarget
        } else {
          // create a default rendering context.
          var canvas = document.createElement("canvas")
          canvas.setAttribute('width',  window.innerWidth)
          canvas.setAttribute('height', window.innerHeight)
          document.body.style.background = '#101010'

          // 3D scene container.
          self.scene = document.getElementById('container')
          self.scene.appendChild(canvas)
        }

        // touch controller.
        self.controller = new Controller({
          container: self.scene,
          mouseSupport: ('createTouch' in document ? false : true),
          strokeStyle: '#FFFF00'
        })

        self.emit('init')

        // Now actually start the game loop running.
        self.update(new Date().getTime())

    })}, 0)
  }

  game_core.prototype.client_create_configuration = function() {
    this.show_2D = false
    this.show_3D = true
    this.heading = 0
    this.color   = '#eebf00'

    this.naive_approach = false     // Whether or not to use the naive approach
    this.show_server_pos = false    // Whether or not to show the server position
    this.show_dest_pos = false      // Whether or not to show the interpolation goal
    this.client_predict = true      // Whether or not the client is predicting input
    this.input_seq = 0              // When predicting client inputs, we store the last input as a sequence number
    this.client_smoothing = true    // Whether or not the client side prediction tries to smooth things out
    this.client_smooth = 8          // amount of smoothing to apply to client update dest

    this.net_latency = 0.001        // the latency between the client and the server (ping/2)
    this.net_ping = 0.001           // The round trip time from here to the server,and back
    this.last_ping_time = 0.001     // The time we last sent a ping
    this.fake_lag = 0               // If we are simulating lag, this applies only to the input client (not others)
    this.fake_lag_time = 0

    this.net_offset = 100           // 100 ms latency between server and client interpolation for other clients
    this.buffer_size = 2            // The size of the server history to keep for rewinding/interpolating.
    this.target_time = 0.01         // the time where we want to be in the server timeline
    this.oldest_tick = 0.01         // the last time tick we have available in the buffer

    this.client_time = 0.01         // Our local 'clock' based on server time - client interpolation(net_offset).
    this.server_time = 0.01         // The time the server reported it was at, last we heard from it
    
    this.dt = 0.016                 // The time that the last frame took to run
    this.fps = 0                    // The current instantaneous fps (1/this.dt)
    this.fps_avg_count = 0          // The number of samples we have taken for fps_avg
    this.fps_avg = 0                // The current average fps displayed in the debug UI
    this.fps_avg_acc = 0            // The accumulation of the last avgcount fps samples

    this.lit = 0
    this.llt = new Date().getTime()
  }

  game_core.prototype.client_connect_to_server = function() {
    // Store a local reference to our connection to the server
    this.socket = io.connect()

    // When we connect, we are not 'connected' until we have a server id
    // and are placed in a game by the server. The server sends us a message for that.
    this.socket.on('connect', function() {
      this.player_self.state = 'connecting'
    }.bind(this))

    // Sent when we are disconnected (network, server down, etc)
    this.socket.on('disconnect', this.client_ondisconnect.bind(this))
    // Sent each tick of the server simulation. This is our authoritive update
    this.socket.on('onserverupdate', this.client_onserverupdate_received.bind(this))
    // Handle when we connect to the server, showing state and storing id's.
    this.socket.on('onconnected', this.client_onconnected.bind(this))
    // On message from the server, we parse the commands and send it to the handlers
    this.socket.on('message', this.client_onnetmessage.bind(this))
  }

  game_core.prototype.client_ondisconnect = function(data) {
    // Perform any cleanup required when we disconnect.
  }

  game_core.prototype.client_onconnected = function(data) {
    // The server responded with our unique identity.
    this.player_self.uuid = data.id
  }

  game_core.prototype.client_create_ping_timer = function() {
    // Set a ping timer to 1 second, to maintain the ping/latency between
    // client and server and calculated roughly how our connection is doing

    setInterval(function() {
      this.last_ping_time = new Date().getTime() - this.fake_lag
      this.socket.send('p.' + (this.last_ping_time))
    }.bind(this), 1000)
  }

  game_core.prototype.client_create_debug_gui = function() {
    this.gui = new dat.GUI({ width: 200 })

    var _playersettings = this.gui.addFolder('Your settings')
    this.colorcontrol = _playersettings.addColor(this, 'color')

    // Register event to fire when we change color.
    this.colorcontrol.onChange(function(value) {
      this.player_set[this.player_self.uuid].color = value
    }.bind(this))

    _playersettings.add(this, 'show_2D').onChange(function(value) {

      this.viewport.style.visibility = value ? 'visible' : 'hidden'
    }.bind(this))

    _playersettings.add(this, 'show_3D').onChange(function(value) {
      this.scene.firstChild.style.visibility = value ? 'visible' : 'hidden'
    }.bind(this))

    _playersettings.add(this, 'heading').listen()
    _playersettings.open()

    var _othersettings = this.gui.addFolder('Methods')

    _othersettings.add(this, 'naive_approach').listen()
    _othersettings.add(this, 'client_smoothing').listen()
    _othersettings.add(this, 'client_smooth').listen()
    _othersettings.add(this, 'client_predict').listen()

    var _debugsettings = this.gui.addFolder('Debug view')
        
    _debugsettings.add(this, 'fps_avg').listen()
    _debugsettings.add(this, 'show_server_pos').listen()
    _debugsettings.add(this, 'show_dest_pos').listen()
    _debugsettings.add(this, 'local_time').listen()

    _debugsettings.open()

    var _consettings = this.gui.addFolder('Connection')
    _consettings.add(this, 'net_latency').step(0.001).listen()
    _consettings.add(this, 'net_ping').step(0.001).listen()

    // When adding fake lag, we need to tell the server about it.
    var lag_control = _consettings.add(this, 'fake_lag').min(0.0).step(0.001).listen()
    lag_control.onChange(function(value) {
      this.socket.send('l.' + value)
    }.bind(this))

    _consettings.open()

    var _netsettings = this.gui.addFolder('Networking')
        
    _netsettings.add(this, 'net_offset').min(0.01).step(0.001).listen()
    _netsettings.add(this, 'server_time').step(0.001).listen()
    _netsettings.add(this, 'client_time').step(0.001).listen()

    _netsettings.open()
  }

  game_core.prototype.update = function(t) {
    // delta time
    this.dt = this.lastframetime ? ((t - this.lastframetime) / 1000.0).fixed() : 0.016

    this.lastframetime = t
    this.client_update()
    this.emit('update')

    // schedule the next update
    this.updateid = requestAnimationFrame(this.update.bind(this), this.viewport)
  }

  game_core.prototype.check_collision = function(player) {
    // TODO: collisions not implemented yet !
  }

  game_core.prototype.client_get_inputs = function() {

    // process controller coordinates
    cX = this.controller.deltaX() * 0.016
    cZ = this.controller.deltaY() * 0.016

    // ignore smaller controller movements,
    // and avoid the additional calculations that follow..
    if ((cX > -0.1 && cX < 0.1) && (cZ > -0.1 && cZ < 0.1)) return

    // clamp the values (i.e. max velocity)
    cX = Math.min(Math.max(cX, -3), 3)
    cZ = Math.min(Math.max(cZ, -3), 3)

    return { x:cX, y:0, z:cZ }
  }

  game_core.prototype.client_onserverupdate_received = function(data) {
    this.server_time = data.t
    this.client_time = this.server_time - (this.net_offset / 1000)

    for (var id in data.vals) {
      // player must exist before it can be updated.
      if (this.player_set[id] === undefined) {
        // create local player character (with pos & color).
        this.add_player(id, data.vals[id].pos, data.vals[id].idx)
        // player color is decided, we don't need this anymore.
        delete data.vals[id].idx
      }

      if (this.naive_approach) {
        this.player_set[id].pos = this.pos(data.vals[id].pos)

      } else {
        this.server_updates.push(data)

        if (this.server_updates.length >= (60 * this.buffer_size)) {
          this.server_updates.splice(0, 1)
        }

        this.oldest_tick = this.server_updates[0].t
        this.client_process_net_prediction_correction()
      }
    }

    // purge any local players that don't exist in this update
    // because they are out-of-range (issue #3) or disconnected.
    for (var id in this.player_set) {
      if (data.vals[id] === undefined) {
        this.remove_player(id)
      }
    }
  }

  game_core.prototype.client_process_net_prediction_correction = function() {
    // No updates...
    if (! this.server_updates.length) return

    // The most recent server update
    var latest_server_data = this.server_updates[this.server_updates.length - 1]

    // Our latest server position
    var my_server_pos = latest_server_data.vals[latest_server_data.uuid].pos

    // here we handle our local input prediction,
    // by correcting it with the server and reconciling its differences

    var my_last_input_on_server = latest_server_data.vals[latest_server_data.uuid].isq
    if (my_last_input_on_server) {
      // The last input sequence index in my local input list
      var lastinputseq_index = -1
      // Find this input in the list, and store the index
      for (var i=0, l=this.player_self.inputs.length; i<l; ++i) {
        if (this.player_self.inputs[i].seq == my_last_input_on_server) {
          lastinputseq_index = i
          break
        }
      }

      // Now we can crop the list of any updates we have already processed
      if (lastinputseq_index != -1) {

        // remove the rest of the inputs we have confirmed on the server
        var number_to_clear = Math.abs(lastinputseq_index - (-1))
        this.player_self.inputs.splice(0, number_to_clear)
        // The player is now located at the new server position, authoritive server
        this.player_self.cur_state.pos = this.pos(my_server_pos)
        this.player_self.last_input_seq = lastinputseq_index
        // Now we reapply all the inputs that we have locally that
        // the server hasn't yet confirmed. This will 'keep' our position the same,
        // but also confirm the server position at the same time.
        this.update_physics()
        this.client_update_local_position()
      }
    }
  }

  game_core.prototype.update_physics = function() {
    if (this.client_predict) {
      this.player_self.old_state.pos = this.pos(this.player_self.cur_state.pos)
      var nd = this.process_input(this.player_self)
      this.player_self.cur_state.pos = this.v_add(this.player_self.old_state.pos, nd)
      this.player_self.state_time = this.local_time
    }
  }

  game_core.prototype.client_update_local_position = function() {
    if (this.client_predict) {
      // Work out the time we have since we updated the state
      var t = (this.local_time - this.player_self.state_time) / this._pdt

      // Then store the states for clarity,
      var old_state = this.player_self.old_state.pos
      var current_state = this.player_self.cur_state.pos

      // Make sure the visual position matches the states we have stored
      //this.player_self.pos = this.v_add(old_state, this.v_mul_scalar(this.v_sub(current_state,old_state), t))
      this.player_self.pos = current_state

      // TODO: collisions are not implemented yet !
      // We handle collision on client if predicting.
      //this.check_collision( this.player_self )
    }
  }

  game_core.prototype.client_update = function() {
    // Check for client movement (if any).
    // Values are transmitted to the server and also
    // stored locally and get processed on next physics tick.

    var input_coords = this.client_get_inputs()
    if (input_coords) this.client_handle_input(input_coords)

    // Set actual player positions from the server update.
    if (! this.naive_approach) {
      this.client_process_net_updates()
    }
    this.client_update_local_position()

    if (this.show_3D) this.emit('render')

    if (this.show_2D) {
      // need the client players current position to use
      // when calculating relative positions on the map view.
      var map_offset_pos = this.player_self.pos

      // Clear 2D viewport (player map)
      this.ctx.clearRect(0, 0, this.viewport.width, this.viewport.height)

      for (var id in this.player_set) {

        if (this.player_self.uuid != id || this.fake_lag > 0) {
          // only showing _other_ players on the 2d map
          // (rendering them in reverse opacity order)
          //
          // unless we are simulating network lag on client !!

          // destination ghost?
          if (this.show_dest_pos && !this.naive_approach) {
            this.player_set[id].render_2d({ lerp: true, pos: map_offset_pos }, this)
          }

          // server ghost?
          if (this.show_server_pos && ! this.naive_approach) {
            this.player_set[id].render_2d({ ghost: true, pos: map_offset_pos }, this)
          }

          // player
          this.player_set[id].render_2d({ player: true, pos: map_offset_pos }, this)

        }
      }
    }
    
    // Work out the fps average
    this.client_refresh_fps()
  }

  game_core.prototype.client_process_net_updates = function() {
    // No updates...
    if (! this.server_updates.length) return

    // First:
    // Find the position in the updates, on the timeline
    // We call this current_time, then we find the past_pos
    // and the target_pos using this, searching throught the
    // server_updates array for current_time in between 2 other times.
    // Then:
    // other player position = lerp(past_pos, target_pos, current_time)

    // Find the position in the timeline of updates we stored.
    var current_time = this.client_time
      , count = this.server_updates.length - 1
      , target = null
      , previous = null

    // We look from the 'oldest' updates, since the newest ones are at the
    // end (list.length-1 for example). This will be expensive only when
    // our time is not found on the timeline, since it will run all samples.
    // Usually this iterates very little before breaking out with a target.
    for (var i=0; i<count; ++i) {

      var point = this.server_updates[i]
      var next_point = this.server_updates[i + 1]

      // Compare our point in time with the server times we have
      if (current_time > point.t && current_time < next_point.t) {
        target = next_point
        previous = point
        break
      }
    }

    // With no target we store the last known
    // server position and move to that instead
    if (! target) {
      target = this.server_updates[0]
      previous = this.server_updates[0]
    }

    // Now that we have a target and a previous destination,
    // We can interpolate between them based on 'how far in between' we are.
    // This is simple percentage maths, value/target = [0,1] range of numbers.
    // lerp requires the 0,1 value to lerp to? thats the one.

    if (target && previous) {
      this.target_time = target.t

      var difference = this.target_time - current_time
        , max_difference = (target.t - previous.t).fixed(3)
        , time_point = (difference / max_difference).fixed(3)

      // Because we use the same target and previous in extreme cases
      // It is possible to get incorrect values due to division by 0 difference
      // and such. This is a safe guard and should probably not be here. lol.
      if (isNaN(time_point)) time_point = 0
      if (time_point == -Infinity) time_point = 0
      if (time_point == Infinity) time_point = 0

      // The most recent server update
      var latest_server_data = this.server_updates[this.server_updates.length - 1]

      for (var id in latest_server_data.vals) {
        // These are the exact server positions from this tick, but only for the ghost
        var other_server_pos = (latest_server_data.vals[id]) ? latest_server_data.vals[id].pos : 0

        // The other players positions in this timeline, behind us and in front of us
        var other_target_pos = (target.vals[id]) ? this.pos(target.vals[id].pos) : 0
          , other_past_pos = (previous.vals[id]) ? this.pos(previous.vals[id].pos) : other_target_pos  //set to target if this guy is new

        if (this.player_set[id]) {
          // update the dest block, this is a simple lerp
          // to the target from the previous point in the server_updates buffer
          this.player_set[id].ghostpos = this.pos(other_server_pos)
          this.player_set[id].destpos  = this.v_lerp(other_past_pos, other_target_pos, time_point)

          // apply smoothing from current pos to the new destination pos
          if (this.client_smoothing) {
            this.player_set[id].pos = this.v_lerp(this.player_set[id].pos, this.player_set[id].destpos, this._pdt * this.client_smooth)
          } else {
            this.player_set[id].pos = this.pos(this.player_set[id].destpos)
          }
        }
      }

      // Now, if not predicting client movement, we will maintain the local player position
      // using the same method, smoothing the players information from the past.
      if (! this.client_predict && ! this.naive_approach) {

        // These are the exact server positions from this tick, but only for the ghost
        var my_server_pos = latest_server_data.vals[latest_server_data.uuid].pos

        // The other players positions in this timeline, behind us and in front of us
        var my_target_pos = target.vals[target.uuid].pos
          , my_past_pos = previous.vals[previous.uuid].pos

        // Snap the ghost to the new server position
        this.player_self.ghostpos = this.pos(my_server_pos)
        var local_target = this.v_lerp(my_past_pos, my_target_pos, time_point)

        // Smoothly follow the destination position
        if (this.client_smoothing) {
          this.player_self.pos = this.v_lerp(this.player_self.pos, local_target, this._pdt * this.client_smooth)
        } else {
          this.player_self.pos = this.pos(local_target)
        }
      }
    }
  }

  game_core.prototype.client_onping = function(data) {
    this.net_ping = new Date().getTime() - parseFloat(data)
    this.net_latency = this.net_ping / 2
  }

  game_core.prototype.client_onnetmessage = function(data) {
    var commands = data.split('.')
      , command = commands[0]
      , subcommand  = commands[1] || null
      , commanddata = commands[2] || null

    if (command === 's' && subcommand === 'p')
      this.client_onping(commanddata)
  }

  game_core.prototype.client_refresh_fps = function() {
    // We store the fps for 10 frames, by adding it to this accumulator
    this.fps = 1 / this.dt
    this.fps_avg_acc += this.fps
    this.fps_avg_count++

    // When we reach 10 frames we work out the average fps
    if (this.fps_avg_count >= 10) {
      this.fps_avg = this.fps_avg_acc / 10
      this.fps_avg_count = 1
      this.fps_avg_acc = this.fps
    }
  }

  game_core.prototype.remove_player = function(id) {
    // Note: at some point we may need to cleanup player_set
    // removing out-of-range players with no recent updates.
    this.playercount--
    this.emit('remove_mesh', id)
    delete this.player_set[id]
    console.log('Player quit: ' + this.playercount + ' remaining')
  }

  game_core.prototype.add_player = function(id, pos, idx) {
    // player must exist so that we can apply the update.
    this.playercount++
    this.player_set[id] = new Player(this)
    this.player_set[id].uuid = id
    this.player_set[id].cur_state = pos

    // need to override these values obtained from server.
    this.player_set[id].index = parseInt(idx)
    this.player_set[id].state = this.player_set[id].index ? 'orange' : 'lemon'
    this.player_set[id].color = this.player_set[id].index ? '#EE9000' : '#EEEE00'
    this.player_set[id].color_2d = this.player_set[id].index ? '#EE9000' : '#EEEE00'

    if (id == this.player_self.uuid && this.colorcontrol != undefined) {
      this.colorcontrol.setValue(this.player_set[id].color)
    }

    // add player mesh into 3d scene.
    this.emit('add_mesh', this.player_set[id])
    console.log('Player joined: ' + this.playercount + ' total')
  }

  game_core.prototype.client_handle_input = function(inpt) {
    // This takes input from the client and keeps a record,
    // It also sends the input information to the server immediately
    // as it is pressed. It also tags each input with a sequence number.

    if (! inpt) return { x:0, y:0, z:0 }

    var x_dir = inpt.x
      , y_dir = 0
      , z_dir = inpt.z

    if (inpt.x != 0 && inpt.z != 0) {
      // Update what sequence we are on now
      this.input_seq += 1

      // Store the input state as a snapshot of what happened.
      this.player_self.inputs.push({
        inputs: [ inpt.x, inpt.z ],
        time:   this.local_time.fixed(3),
        seq:    this.input_seq
      })

      // modify the coordinate values ready for socket transport to server.
      var input = String(inpt.x).replace('.', ',') + ':' + String(inpt.z).replace('.', ',')

      // Send the packet of information to the server.
      // The input packets are labelled with an 'i' in front.
      var server_packet = 'i.'
      server_packet += input + '.'
      server_packet += this.local_time.toFixed(3).replace('.', '-') + '.'
      server_packet += this.input_seq

      this.socket.send(server_packet)

      // Return the direction if needed
      return this.physics_movement_vector_from_direction(x_dir, y_dir, z_dir)

    } else {
      return { x:0, y:0, z:0 }
    }
  }
