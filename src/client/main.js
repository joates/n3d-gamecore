
  // main.js
  // by joates (Sep-2013)

module.exports = function(game_core) {

  var game = game_core

  // Hardcoded dependency on THREE.
  // TODO: this could be handled better.
  try {
    if (! THREE || parseInt(THREE.REVISION) < 60) throw new Error()
  } catch(err) {
    console.log(err.stack)
    err.description =
      'You need to install the three.js library (r60 or better) and import the <script> ' +
      'in your index.html file BEFORE the game code <script> (bundle.js).'
    console.error(err.description)
  }

  var container
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
    scene.fog = new THREE.Fog(0x111133, 0, 300);

    controller = new Controller({ mouseSupport: false, strokeStyle: '#FFFF00' })

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

    container = document.getElementById('container')
    container.appendChild(renderer.domElement)

    // events.
    window.addEventListener('resize', onWindowResize, false)
  }

  //

  //function scene_update(player_set, uuid) {
  game.prototype.scene_update = function() {
    var uuid = this.player_self.uuid

    for (var id in this.player_set) {
      if (players[id] != undefined && players[id] instanceof THREE.Mesh) {

        if (this.player_set[id] && ! isNaN(this.player_set[id].pos.x)) {
          players[id].position.copy(this.player_set[id].pos)
          // scale down
          players[id].position.multiplyScalar(scale)
        }
      }
    }

    if (players[uuid]) {
      // self color changed ?
      players[uuid].material.color = new THREE.Color(this.player_set[uuid].color)

      // camera follows our player.
      camera.updateMatrixWorld()
      var relativeCameraOffset = new THREE.Vector3(0, 20, 60)

      var cameraOffset = relativeCameraOffset.applyMatrix4(players[uuid].matrixWorld)

      camera.position.copy(cameraOffset)
      camera.lookAt(players[uuid].position)

      //update_player_heading(uuid)
    }
  }

  //

  //function scene_get_inputs() {
  game.prototype.scene_get_inputs = function() {

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

  //

  //function scene_render() {
  game.prototype.scene_render = function() {
    renderer.render(scene, camera)
  }

  //

  //function scene_add_mesh(p, id) {
  game.prototype.scene_add_mesh = function(id) {
    var g = new THREE.CylinderGeometry( 2.6, 3, 2.2, 32, 32, false )
    var m = new THREE.MeshLambertMaterial({ color: this.player_set[id].color })
    players[id] = new THREE.Mesh( g, m )
    players[id].position.copy(this.player_set[id].pos)
    if (scene != undefined) scene.add(players[id])
  }

  //

  //function scene_remove_mesh(id) {
  game.prototype.scene_remove_mesh = function(id) {
    scene.remove(players[id])
    delete players[id]
  }

  //

  function update_player_heading(id) {
    // Note: not used !!
    /**
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
    */
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
}

