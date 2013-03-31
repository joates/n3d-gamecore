/*
    The player class

        A simple class to maintain state of a player on screen,
        as well as to draw that state when required.
*/

    var game_player = function( game_instance, player_instance ) {

            //Store the instance, if any
        this.instance = player_instance;
        this.game = game_instance;

            //Set up initial values for our state information
        this.pos = { x:0, y:0 };
        this.ghostpos = { x:0, y:0 };
        this.destpos = { x:0, y:0 };
        this.size = { x:16, y:16, hx:8, hy:8 };
        this.state = 'not-connected';
        this.color = 'rgba(255,255,255,1)';
        this.info_color = 'rgba(255,255,255,1)';
        this.id = '';
        this.idingame=0;

            //These are used in moving us around later
        this.old_state = {pos:{x:0,y:0}};
        this.cur_state = {pos:{x:0,y:0}};
        this.state_time = new Date().getTime();

            //Our local history of inputs
        this.inputs = [];

            //The world bounds we are confined to
        this.pos_limits = {
            x_min: this.size.hx,
            x_max: this.game.world.width - this.size.hx,
            y_min: this.size.hy,
            y_max: this.game.world.height - this.size.hy
        };

            //The 'host' of a game gets created with a player instance since
            //the server already knows who they are. If the server starts a game
            //with only a host, the other player is set up in the 'else' below
        if(player_instance) {
            this.pos = { x:20, y:20 };
        } else {
            this.pos = { x:20, y:20 };
        }

    }; //game_player.constructor
  
    game_player.prototype.draw = function(){

            //Set the color for this player
        game.ctx.fillStyle = this.color;

            //Draw a rectangle for us
        game.ctx.fillRect(this.pos.x - this.size.hx, this.pos.y - this.size.hy, this.size.x, this.size.y);

            //Draw a status update
        game.ctx.fillStyle = this.info_color;
        game.ctx.fillText(this.state, this.pos.x+10, this.pos.y + 4);


    
    }; //game_player.draw

    game_player.prototype.drawserverghost = function(){

            //Set the color for this player ghost
        game.ctx.fillStyle = 'rgba(255,255,255,0.2)';

            //Draw a rectangle for us
        game.ctx.fillRect(this.ghostpos.x - this.size.hx, this.ghostpos.y - this.size.hy, this.size.x, this.size.y);

            //Draw a status update
        game.ctx.fillStyle = this.info_color;
        game.ctx.fillText('server_pos', this.ghostpos.x+10, this.ghostpos.y + 4);

        
    
    }; //game_player.draw

    game_player.prototype.drawdestghost = function(){

            //Set the color for this player ghost
        game.ctx.fillStyle = 'rgba(255,255,255,0.1)';

            //Draw a rectangle for us
        game.ctx.fillRect(this.destpos.x - this.size.hx, this.destpos.y - this.size.hy, this.size.x, this.size.y);

            //Draw a status update
        game.ctx.fillStyle = this.info_color;
        game.ctx.fillText('dest_pos', this.destpos.x+10, this.destpos.y + 4);

        
    
    }; //game_player.draw
    game_player.prototype.setrandomcolor = function()
    {
        //give this player some random color
        this.color = '#'+Math.floor(Math.random()*16777215).toString(16);
        
    };

    game_player.prototype.resetpos = function(mypos)
    {
        //copies a 2d vector like object from one to another
        var newpos = function(a) { return {x:a.x,y:a.y}; };
        this.pos = newpos(mypos);
        this.old_state.pos = newpos(mypos);
        this.cur_state.pos = newpos(mypos);
        this.ghostpos = newpos(mypos);
        this.destpos = newpos(mypos);
    };

//server side we set the 'game_core' class to a global type, so that it can use it anywhere.
if( 'undefined' != typeof global ) {
    module.exports = global.game_player = game_player;
}