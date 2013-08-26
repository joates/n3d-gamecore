
  //  main.js
  //  by joates (Aug-2013)

  /**
   *  Copyright (c) 2012 Sven "FuzzYspo0N" Bergström
   *  written by : http://underscorediscovery.com
   *  written for : http://buildnewgames.com/real-time-multiplayer/
   *
   *  MIT Licensed.
   */

  var game = {}
    , container
    , camera, scene, renderer
    , WIDTH, HEIGHT
    , scale   = 0.2
    , players = {}
    , controller
    , golden_ratio = 1.6180339887

  //

  function scene_init() {
    WIDTH  = window.innerWidth
    HEIGHT = window.innerHeight

    scene = new THREE.Scene()

    controller = new Controller({ mouseSupport: false, strokeStyle: '#FFFF00' })

    camera = new THREE.PerspectiveCamera(40, WIDTH / HEIGHT, 0.1, 10000)
    camera.position.set(0, 20, 60)
    camera.lookAt(scene.position)

    scene.add(new THREE.AmbientLight(0x20202f))

    var light = new THREE.DirectionalLight(0xffffff, 1.5)
    light.position.set(0.5, 1, 0.5).normalize()
    scene.add(light)

    // ground plane.
    var planeGeometry = new THREE.PlaneGeometry( 1000, 1000, 1, 1 )
    var planeMaterial = new THREE.MeshLambertMaterial({
      color: 0x6666AA, side: THREE.FrontSide
    })
    planeGeometry.applyMatrix(new THREE.Matrix4().makeRotationX(-Math.PI / 2))
    planeGeometry.applyMatrix(new THREE.Matrix4().makeRotationY(-Math.PI / 4))
    planeGeometry.applyMatrix(new THREE.Matrix4().makeTranslation(0, -1.4, 0))
    var plane = new THREE.Mesh( planeGeometry, planeMaterial )

    // tile grid.
    var gridGeometry = new THREE.PlaneGeometry( 1000, 1000, 15, 15 )
    var gridMaterial = new THREE.MeshBasicMaterial({
      color: 0x202020, wireframe: true, wireframeLinewidth: 2.0
    })
    gridGeometry.applyMatrix(new THREE.Matrix4().makeRotationX(-Math.PI / 2))
    gridGeometry.applyMatrix(new THREE.Matrix4().makeRotationY(-Math.PI / 4))
    gridGeometry.applyMatrix(new THREE.Matrix4().makeTranslation(0, -1.2, 0))
    var grid = new THREE.Mesh( gridGeometry, gridMaterial )

    // merge plane & grid into a single object.
    var floor = new THREE.Object3D()
    floor.add(plane)
    floor.add(grid)
    scene.add(floor)

    renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(WIDTH, HEIGHT)
    renderer.autoClear = true

    container = document.getElementById('container')
    container.appendChild(renderer.domElement)

    // events.
    window.addEventListener('resize', onWindowResize, false)
  }

  //

  function scene_update(player_set, uuid) {

    for (var id in player_set) {
      if (players[id] != undefined && players[id] instanceof THREE.Mesh) {

        if (player_set[id] && ! isNaN(player_set[id].pos.x)) {
          players[id].position.copy(player_set[id].pos)
          // scale down
          players[id].position.multiplyScalar(scale)
        }
      }
    }

    if (players[uuid]) {
      // self color changed ?
      players[uuid].material.color = new THREE.Color(player_set[uuid].color)

      // camera follows our player.
      camera.updateMatrixWorld()
      var relativeCameraOffset = new THREE.Vector3(0, 20, 60)

      var cameraOffset = relativeCameraOffset.applyMatrix4(players[uuid].matrixWorld)

      camera.position.copy(cameraOffset)
      camera.lookAt(players[uuid].position)

      update_player_heading(uuid)

      // process controller coordinates
      cX = controller.deltaX() * 0.016
      cZ = controller.deltaY() * 0.016

      // ignore smaller controller movements,
      // and avoid the additional calculations that follow..
      if ((cX > -0.1 && cX < 0.1) && (cZ > -0.1 && cZ < 0.1)) return

      // clamp the values (i.e. max velocity)
      cX = Math.min(Math.max(cX, -3), 3)
      cZ = Math.min(Math.max(cZ, -3), 3)

      return { x:cX, y:0, z:cZ }
    }
  }

  //

  function scene_render() {
    renderer.render(scene, camera)
  }

  //

  function scene_add_mesh(p, id) {
    var g = new THREE.CylinderGeometry( 2.6, 3, 2.2, 32, 32, false )
    var m = new THREE.MeshLambertMaterial({ color: p.color })
    players[id] = new THREE.Mesh( g, m )
    players[id].position.copy(p.pos)
    if (scene != undefined) scene.add(players[id])
  }

  //

  function scene_remove_mesh(id) {
    scene.remove(players[id])
    delete players[id]
  }

  //

  function update_player_heading(id) {
    var q = players[id].quaternion
    var pVec = new THREE.Vector3(1, 0, 0).applyQuaternion(q)

    heading = Math.atan2(pVec.z, pVec.x)
    heading *= 180 / Math.PI
    heading = heading > 0 ? heading : heading + 360
    heading = Math.floor(heading % 360)
    //heading = "Heading: " + heading + '&deg;'
    //document.getElementById("heading").innerHTML = heading
    //players[id].heading = heading
    game_core.heading = heading
  }

  //

  function onWindowResize() {
    WIDTH  = window.innerWidth
    HEIGHT = window.innerHeight
    game.viewport.width  = window.innerWidth * 0.25 - 20
    game.viewport.height = game.viewport.width / golden_ratio

    camera.aspect = WIDTH / HEIGHT
    camera.updateProjectionMatrix()

    renderer.setSize(WIDTH, HEIGHT)
  }

  //

  window.onload = function() {
    // Create a game instance.
    game = new game_core()

    // 2D viewport. (i.e. map)
    game.viewport = document.getElementById('viewport')
		game.viewport.width  = window.innerWidth * 0.25 - 20
		game.viewport.height = game.viewport.width / golden_ratio
    game.ctx = game.viewport.getContext('2d')
    game.ctx.font = '11px "Helvetica"'

    // 3D scene.
    game.scene = document.getElementById('container')
    scene_init()

    // Start the main game loop.
    game.update(new Date().getTime())
  }

