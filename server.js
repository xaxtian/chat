/**
 * Server.js
 * @author : DiganmeGiovanni | https://twitter.COM/DiganmeGiovanni
 * @Created on: 25 Oct, 2014
 */
 
 
/* Librerias necesarias para la aplicación */
var bodyParser  = require('body-parser');
var express     = require('express');
var app         = express();
var http        = require('http').Server(app);
var io          = require('socket.io')(http);
var MongoClient = require('mongodb').MongoClient;
var userDAO     = require('./dao/UserDAO').UserDAO;
 
// Para acceder a los parametros de las peticiones POST
app.use(bodyParser.urlencoded());

app.use(bodyParser.json());
 
/* Mongodb config */
var mdbconf = {
  host: 'localhost',
  port: '27017',
  db: 'chatSS'
};
 
/* Get a mongodb connection and start application */
MongoClient.connect('mongodb://'+mdbconf.host+':'+mdbconf.port+'/'+mdbconf.db, function (err, db) {
  
  if (err) return new Error('Connection to mongodb unsuccessful');
  
  var usersDAO = new userDAO(db); // Initialize userDAO
  var onlineUsers = [];
  
  
/** *** *** ***
 *  Configuramos el sistema de ruteo PARA las peticiones web:
 */
  
  app.get('/signup', function (req, res) {
    res.sendFile( __dirname + '/views/signup.html');
  });
  
  app.post('/signup', function (req, res) {
    var username = req.body.username;
    var password = req.body.password;
    var email    = req.body.email;
    
    usersDAO.addUser(username, password, email, function (err, user) {
      if (err) {
        res.send({ 'error': true, 'err': err});
      }
      else {
        user.password = null;
        res.send({ 'error': false, 'user': user });
      }
    });
  });
 
  app.post('/login', function (req, res) {
    var username = req.body.username;
    var password = req.body.password;
    
    usersDAO.validateLogin(username, password, function (err, user) {
      if (err) {
        res.send({'error': true, 'err': err});
      }
      else {
        user.password = null;
        res.send({ 'error': false, 'user': user});
      }
    });
  });
  
  /** css and js request */
  app.get('/css/foundation.min.css', function (req, res) {
    res.sendFile(__dirname + '/views/css/foundation.min.css');
  });
 
  app.get('/css/normalize.css', function (req, res) {
    res.sendFile(__dirname + '/views/css/normalize.css');
  });
  
  app.get('/js/foundation.min.js', function (req, res) {
    res.sendFile(__dirname + '/views/js/foundation.min.js');
  });
  /** *** *** */
  
  app.get('*', function(req, res) {
    res.sendFile( __dirname + '/views/chat.html');
  });
 
 
  /** *** *** ***
   *  Configuramos Socket.IO PARA estar a la escucha de
   *  nuevas conexiones. 
   */
  io.on('connection', function(socket) {
    
    console.log('New user connected');
    
    /**
     * CADA NUEVO cliente solicita con ESTE evento la lista
     * de usuarios conectados en el MOMENTO.
     */
    socket.on('all online users', function () {
      socket.emit('all online users', onlineUsers);
    });
    
    /**
     * Cada nuevo socket debera estar a la escucha
     * del evento 'chat message', el cual se activa
     * cada vez que un usuario envia un mensaje.
     * 
     * @param  msg : Los DATOS enviados desde el cliente a 
     *               través del socket.
     */
    socket.on('chat message', function(msg) {
      io.emit('chat message', msg);
    });
    
    /**
     * Mostramos en consola cada vez que un usuario
     * se desconecte del sistema.
     */
    socket.on('disconnect', function() {
      onlineUsers.splice(onlineUsers.indexOf(socket.user), 1);
      io.emit('remove user', socket.user);
      console.log('User disconnected');
    });
    
    /**
     * Cuando un cliente se conecta, emite este evento
     * PARA informar al resto de usuarios que se ha conectado.
     * @param  {[type]} nuser El NUEVO usuarios
     */
    socket.on('new user', function (nuser) {
      socket.user = nuser;
      onlineUsers.push(nuser);
      io.emit('new user', nuser);
    });
    
  });
 
 
  /**
   * INICIAMOS la aplicación en el puerto 3000
   */
  http.listen(3000, function() {
    console.log('listening on *:3000');
  });
});

