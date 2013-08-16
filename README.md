## n3d-gamecore (0.0.1-alpha)

the codebase is considered **ALPHA quality** only, should be OK to use but is 'unstable' because the API will probably change without notice. If you pull updates from 'dev' branch and it breaks your code, its on you, *that* is your warning. _Use at own risk_.

You will need to install the *Three.js* library wherever you are hosting the server because it is not bundled with this component. See the [website](http://threejs.org) for more info.


####3D WebGL Multi-Player Game Engine (Node.js / Three.js / HTML5)
This is a Node.js websockets application which provides the core functionality of a 3D multi-player game engine, most of  the original 2D code remains, it has been re-purposed to provide the player mini-map overhead view, the client and server messaging subsystem implements client prediction and responds to client input with authoritative server update packets using socket.io (Express is included but its only doing basic routing to serve the 'public/' folder files at the moment) and all of the 3D scene rendering in the browser is provided by Three.js, all connected clients will need to be running a modern WebGL/HTML5 compatible browser (such as Chrome or Firefox)

This is **not** a fully functional game, it is intended to be a scalable realtime massively multi-player component to incorporate into your game project, my goal is to support up to 512k concurrent connections (at a future stage of the project). The concept will be to keep this core component as lean and efficient as possible without adding many additional features (i.e. sophisticated collision physics) but to also include a stable API so that those extra features can easily be provided by other Node.js modules.


#### Change history
* _Aug.2012_  Original Source by [Sven Bergström](https://github.com/underscorediscovery)
* _Apr.2013_  Forked and updated by [Asad Memon](https://github.com/asadlionpk)
* _Aug.2013_  Forked and extended to support 3D (as well as 2D) by [joates](https://github.com/joates)


## Realtime Multiplayer In HTML5

Read the original article here (2D only): 
http://buildnewgames.com/real-time-multiplayer/

#### Getting started (Using npm package.json)
* Get three.js (info [here](http://threejs.org))
* `git clone` this repository and `cd` into it
* check that the links in `public/index.html` can access `three.min.js` (& `dat.gui.min.js` is optional)
* Get node.js (info [here](http://nodejs.org/download/))
  * run `npm install` inside the cloned folder
  * run `node app.js` inside the cloned folder
* Visit `http://localhost:8000` with your browser
  * use `http://localhost:8000/?debug` as the URL if you want to enable the debug interface.

#### Getting started (Manual install)
* Get three.js (info [here](http://threejs.org))
* `git clone` this repository and `cd` into it
* check that the links in `public/index.html` can access `three.min.js` (& `dat.gui.min.js` is optional)
* Get node.js (info [here](http://nodejs.org/download/))
  * Install socket.io `npm install socket.io`
  * Install node-udid `npm install node-uuid`
  * Install express `npm install express`
* Run node app.js inside the cloned folder
* Visit `http://localhost:8000` with your browser
  * use `http://localhost:8000/?debug` as the URL if you want to enable the debug interface.


MIT Licensed.
