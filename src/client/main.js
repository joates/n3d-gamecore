
  // main.js
  // by joates (Sep-2013)

  // Hardcoded dependency on THREE (https://github.com/mrdoob/three.js)
  try {
    if (! THREE || parseInt(THREE.REVISION) < 60) throw new Error()
  } catch(err) {
    console.log(err.stack)
    err.description =
      'You need to install the three.js library (r60 or better) and import the <script> ' +
      'in your index.html file BEFORE the game code <script> (bundle.js).'
    console.error(err.description)
  }

  var Game = require('./gamecore.js')
    , renderer
    , scene
    , camera
    , WIDTH
    , HEIGHT
    , scale   = 0.2
    , players = {}
    , golden_ratio = 1.6180339887

  function scene_init() {
    // called AFTER gamecore has initialized
    // Note: gamecore already has a rendering context and 
    // the game loop is updating and rendering at 60hz.
  }

  function create_3d_context() {
    WIDTH  = window.innerWidth
    HEIGHT = window.innerHeight

    scene = new THREE.Scene()
    scene.fog = new THREE.Fog(0x111133, 0, 300);

    camera = new THREE.PerspectiveCamera(40, WIDTH / HEIGHT, 0.1, 10000)
    camera.position.set(0, 20, 60)
    camera.lookAt(scene.position)

    scene.add(new THREE.AmbientLight(0x20202f))

    var light = new THREE.DirectionalLight(0xffffff, 1.5)
    light.position.set(0.5, 1, 0.5).normalize()
    scene.add(light)

    // ground plane.
    var planeSize = 1024
      , planeGeometry = new THREE.PlaneGeometry( planeSize, planeSize, 1, 1 )
      , planeMaterial = new THREE.MeshLambertMaterial({
      color: 0x6666AA, side: THREE.FrontSide
    })
    planeGeometry.applyMatrix(new THREE.Matrix4().makeRotationX(-Math.PI / 2))
    planeGeometry.applyMatrix(new THREE.Matrix4().makeRotationY(-Math.PI / 4))
    planeGeometry.applyMatrix(new THREE.Matrix4().makeTranslation(0, -1.25, 0))
    var plane = new THREE.Mesh( planeGeometry, planeMaterial )

    // add a parent floor object.
    var floor = new THREE.Object3D()
    floor.add(plane)

    // merge grid lines into floor object.
    var gridSize = 9
      , gridScale = planeSize / gridSize
      , half_cell = gridScale * 0.5
      , gridMaterial = new THREE.LineBasicMaterial({ color: 0x8888CC, linewidth: 1.5 })
    for (var i=1, l=gridSize; i<l; i++) {

      // horizontal direction
      var gridGeometryX = new THREE.Geometry()
      gridGeometryX.vertices.push(
        new THREE.Vector3(-512, 0, -512 + (i * gridScale)),
        new THREE.Vector3( 512, 0, -512 + (i * gridScale))
      )
      gridGeometryX.applyMatrix(new THREE.Matrix4().makeRotationY(-Math.PI / 4))
      gridGeometryX.applyMatrix(new THREE.Matrix4().makeTranslation(0, -1.2, 0))
      var gridX = new THREE.Line( gridGeometryX, gridMaterial )
      floor.add(gridX)

      // vertical direction
      var gridGeometryZ = new THREE.Geometry()
      gridGeometryZ.vertices.push(
        new THREE.Vector3(-512 + (i * gridScale), 0, -512),
        new THREE.Vector3(-512 + (i * gridScale), 0,  512)
      )
      gridGeometryZ.applyMatrix(new THREE.Matrix4().makeRotationY(-Math.PI / 4))
      gridGeometryZ.applyMatrix(new THREE.Matrix4().makeTranslation(0, -1.2, 0))
      var gridZ = new THREE.Line( gridGeometryZ, gridMaterial )
      floor.add(gridZ)
    }

    // add floor (plane & grid lines) to the scene.
    scene.add(floor)

    renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(WIDTH, HEIGHT)
    renderer.setClearColor(scene.fog.color, 1);

    // store the 3D rendering context in the game object.
    var container = document.getElementById('container')
    container.appendChild(renderer.domElement)

    // events.
    window.addEventListener('resize', onWindowResize, false)

    return container
  }

  function scene_update(game_core) {
    var game = game_core
      , uuid = game.player_self.uuid

    for (var id in players) {
      players[id].position.copy(game.player_set[id].pos)
      players[id].position.multiplyScalar(scale)      // scale down

      if (id === uuid) {
        // self color changed ?
        players[id].material.color = new THREE.Color(game.player_set[uuid].color)

        // camera follows our player.
        camera.updateMatrixWorld()
        var relativeCameraOffset = new THREE.Vector3(0, 20, 60)
        var cameraOffset = relativeCameraOffset.applyMatrix4(players[id].matrixWorld)
        camera.position.copy(cameraOffset)
        camera.lookAt(players[id].position)
      }
    }
  }

  function scene_render() {
    renderer.render(scene, camera)
  }

  function scene_add_mesh(new_player) {
    var geometry = new THREE.CylinderGeometry(2.6, 3, 2.2, 32, 32, false)
    var material = new THREE.MeshLambertMaterial({ color: new_player.color })
    players[new_player.uuid] = new THREE.Mesh(geometry, material)
    players[new_player.uuid].position.copy(new_player.pos)
    if (scene != undefined) scene.add(players[new_player.uuid])
  }

  function scene_remove_mesh(id) {
    scene.remove(players[id])
    delete players[id]
  }

  function onWindowResize() {
    WIDTH  = window.innerWidth
    HEIGHT = window.innerHeight
    game.viewport.width  = window.innerWidth * 0.25 - 20
    game.viewport.height = game.viewport.width / golden_ratio

    camera.aspect = WIDTH / HEIGHT
    camera.updateProjectionMatrix()

    renderer.setSize(WIDTH, HEIGHT)
  }

  window.onload = function() {
    var context = create_3d_context()  // rendering context.
    game = new Game({ el: context })   // game instance.

    // Register event listeners.
    game.on('init',   function() { scene_init() })
    game.on('update', function() { scene_update(game) })
    game.on('render', function() { scene_render() })
    game.on('add_mesh',    function(player) { scene_add_mesh(player) })
    game.on('remove_mesh', function(uuid) { scene_remove_mesh(uuid) })
  }

