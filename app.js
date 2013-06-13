var express = require('express')
  , app = express()
  , http = require('http')
  , server = http.createServer(app)
  , io = require('socket.io').listen(server);

server.listen(80);

var logger  = io.log;
//var sleep = require('sleep');
    
// routing
app.get('/', function (req, res) {
    
  res.sendfile(__dirname + '/index.html');
});

// usernames which are currently connected to the game
var usernames = {};
var usersockets = {};

// rooms which are currently available in game
var rooms = {};
var gameCount = 0;
var gamePlayers = {};


io.sockets.on('connection', function (socket) {
	
	// when the client emits 'adduser', this listens and executes
	socket.on('adduser', function(username){
		// store the username in the socket session for this client
		socket.username = username;
		// add the client's username to the global list
		usernames[username] = username;
                usersockets[username] = socket;
                
                socket.emit('updateusers', usernames, username);   //gamePlayers
                socket.broadcast.emit('updateusers', usernames);   //gamePlayers             
                logger.info("***" + "adduser" + "***");
	});
	
	// when the client emits 'sendchat', this listens and executes
	socket.on('sendchat', function (data, turncomplete, noOfPlayTurns, noInSeq) {
		// we tell the client to execute 'updatechat' with 2 parameters
                logger.info("***" + "sendchat" + "***");
                logger.info("*** " + "RecvdFrom: " + socket.username + "***");
                logger.info("*** " + "gamePlayers[socket.username]: " + gamePlayers[socket.username] + "***");
                logger.info("*** " + "socket.room: " + socket.room + "***");
                logger.info("*** " + "color played: " + data + "***");
                logger.info("*** " + "isTurnUp: " + turncomplete + "***");
                logger.info("*** " + "noOfPlayTurns: " + noOfPlayTurns + "***");
                logger.info("*** " + "colors in Seq: " + noInSeq + "***");
                
                //io.sockets.in(socket.room).emit('showColourSequence', data);
                //socket.broadcast.to(socket.room).emit('showColourSequence', data);		
                
                socket.emit('showColourSequence', data);  
                socketU = usersockets[gamePlayers[socket.username]];  
                socketU.emit('showColourSequence', data);  

                //sleep for 2s

            
                if(turncomplete){
                    setTimeout((function() {
                        noOfPlayTurns++;
                        socketU.emit('play', noOfPlayTurns, noInSeq, data);                            
                        socket.emit('showColourSequence', '');
                        
                        }), 1000);
                }
                
                           
                //socket.broadcast.to(socket.room).emit('gameResult', gamePlayers[socket.username]);        
                
                logger.info("***" + "sendchat" + "***");

	});
	

	socket.on('accept', function (challenger) {
		//Setup game room
                gameCount++;
                rooms['Game' + gameCount] = 'Game' + gameCount;
                
                gamePlayers[socket.username] = challenger;
                gamePlayers[challenger] = socket.username;
                
                socket.room = 'Game' + gameCount;                
		// add the client's username to the global list
		socket.join('Game' + gameCount);
		// echo to client they've connected
		socket.emit('updatechat', 'SERVER', 'you have Accepted challenge for ' + 'Game' + gameCount);
                socketU = usersockets[challenger];                
                socketU.room = 'Game' + gameCount;    
                socketU.join('Game' + gameCount);
		socketU.emit('updatechat', 'SERVER', 'your Challenge has been Accepted to ' + 'Game' + gameCount);
                
		// echo to game that a person has connected to their GAME  
                socket.broadcast.to('Game' + gameCount).emit('updatechat', 'SERVER ', challenger + ' vs ' + socket.username + 'Game' + gameCount);		
                socket.emit('updaterooms', rooms, 'Game' + gameCount);
		socketU.emit('updaterooms', rooms, 'Game' + gameCount);
		
                socketU.emit('gameStart', socket.username, challenger, 'Game' + gameCount);
                socket.emit('gameStart', socket.username, challenger, 'Game' + gameCount);
                
                //socketU is challenger;
                //Signal to player play
                 
                socketU.emit('play', 1, 0, '');
                
                logger.info("***" + "accept" + "***");
                
	});


	socket.on('reject', function (challenger) {
		socket.emit('updatechat', 'SERVER', 'you have REJECTED challenge by ' + socket.username);                
		socketU = usersockets[challenger];                

                socketU.emit('updatechat', 'SERVER', socket.username + ' have REJECTED challenge ');
                socket.emit('updatechat', 'SERVER', socket.username + ' have REJECTED challenge ');
                
                socketU.emit('updateusers', usernames, socketU.username);   //gamePlayers
                socket.emit('updateusers', usernames, socket.username);   //gamePlayers
                logger.info("***" + "reject" + "***");
                
	});
        
        
	socket.on('challengeUser', function(user, points){
                socket.emit('updatechat', 'SERVER', 'you ' + socket.username + ' have challenged '+ user + ' for ' + points + ' points');
		socketU = usersockets[user];                
                socketU.emit('challenge', user, socket.username, points);
                
                logger.info("***" + "challengeUser" + "***");
	});


        
                                
	socket.on('gameResult', function(user){
 
 
		socketU = usersockets[gamePlayers[user]];                
                socketU.emit('gameResult', gamePlayers[user]);
                socket.emit('gameResult', gamePlayers[user]);

                //socket.broadcast.to('Game' + gameCount).emit('updatechat', 'SERVER ', challenger + ' vs ' + socket.username + 'Game' + gameCount);                
                logger.info("***" + "gameResult" + "***");
	});

	socket.on('resetGame', function(datestr, user, game, challenger, gameWinner,  score){
                logger.info("***" + datestr + ',' + user + ',' +  game + ',' +  challenger + ',' +  gameWinner + ',' +   score + "***");
		socket.leave(game);
                //socket.emit('gameEnd', socket.username);          
                //socket.broadcast.to('Game' + gameCount).emit('updatechat', 'SERVER ', challenger + ' vs ' + socket.username + ' Game' + gameCount);

                delete gamePlayers[socket.username];                
                
                socket.emit('updateusers', usernames, username);
                
                logger.info("***" + "resetGame" + "***");
	});

	// when the user disconnects.. perform this
	socket.on('disconnect', function(){
		// remove the username from global usernames list
		delete usernames[socket.username];
                
		// update list of users in chat, client-side
		io.sockets.emit('updateusers', usernames);  //gamePlayers
		
            // echo globally that this client has left
		socket.broadcast.emit('updatechat', 'SERVER', socket.username + ' has disconnected');
		socket.leave(socket.room);
                delete usersockets[socket.username];
                
                logger.info("***" + "disconnect" + "***");
                
	});
});
