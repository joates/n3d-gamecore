
  // gamecore.common.js
  // by joates (Sep-2013)

  module.exports = function(game_core) {

    Number.prototype.fixed = function(n) { n = n || 3; return parseFloat(this.toFixed(n)) }
    game_core.prototype.pos = function(a) { return { x:a.x, y:a.y, z:a.z } }
    game_core.prototype.v_add = function(a, b) { return { x:(a.x + b.x).fixed(), y:(a.y + b.y).fixed(), z:(a.z + b.z).fixed() } }
    game_core.prototype.v_sub = function(a, b) { return { x:(a.x - b.x).fixed(), y:(a.y - b.y).fixed(), z:(a.z - b.z).fixed() } }
    game_core.prototype.v_mul_scalar = function(a, b) { return { x:(a.x * b).fixed(), y:(a.y * b).fixed(), z:(a.z * b).fixed() } }
    game_core.prototype.stop_update = function() { clearTimeout(this.updateid) }
    game_core.prototype.lerp = function(p, n, t) { var _t = Number(t); _t = (Math.max(0, Math.min(1, _t))).fixed(); return (p * (1 - _t) + n * _t).fixed() }
    game_core.prototype.v_lerp = function(v, tv, t) { return { x:this.lerp(v.x, tv.x, t), y:this.lerp(v.y, tv.y, t), z:this.lerp(v.z, tv.z, t) } }


    game_core.prototype.create_physics_simulation = function() {
      setInterval(function() {
        this._pdt  = (new Date().getTime() - this._pdte) / 1000.0
        this._pdte = new Date().getTime()
        this.update_physics()
      }.bind(this), 15)
    }


    game_core.prototype.create_timer = function() {
      setInterval(function() {
        this._dt  = new Date().getTime() - this._dte
        this._dte = new Date().getTime()
        this.local_time += this._dt / 1000.0
      }.bind(this), 4)
    }


    game_core.prototype.physics_movement_vector_from_direction = function(x, y, z) {

      // Must be fixed step, at physics sync speed.
      return {
        x: (x * (this.playerspeed * 0.015)).fixed(3),
        y: (y * (this.playerspeed * 0.015)).fixed(3),
        z: (z * (this.playerspeed * 0.015)).fixed(3)
      }
    }


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
  }
