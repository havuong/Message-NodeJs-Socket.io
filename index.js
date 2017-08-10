var express = require('express');
var app = express();
var port = process.env.PORT || 3000;
var mongoose = require('mongoose');
var passport = require('passport');
var flash = require('connect-flash');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var session = require('express-session');
var configDB = require('./config/database.js');
var multer = require('multer');

mongoose.Promise = require('bluebird');
mongoose.connect(configDB.url);

app.use(cookieParser());
app.use(bodyParser());

app.use(bodyParser.json({limit: '5mb'}));
app.use(bodyParser.urlencoded({limit: '5mb'}));

app.set('view engine', 'ejs');
app.use(express.static('public'))
app.use(session({ secret: 'dmessage' }));
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

var server = require('http').Server(app);
var io = require('socket.io')(server);

server.listen(port);
console.log('Server running at port ' + port);

// setup upload
function getImageType(type) {
    switch (type) {
        case 'image/jpg': return ".jpg";
        case 'image/jpeg': return ".jpg";
        case 'image/png': return '.png';
    }
}
var storage = multer.diskStorage({
    destination: function (req, file, callback) {
        callback(null, "./public/upload");
    },
    filename: function (req, file, callback) {
        callback(null, file.fieldname + "_" + Date.now() + getImageType(file.mimetype));
    }
});
var upload = multer({
    storage: storage,
    limits: { fileSize: 1024*1024 }
}).single('imgUploader');

require('./config/passport')(passport);
require('./app/routes.js')(app, passport, upload);

var User = require('./app/models/user');
var Message = require('./app/models/message');
var Room = require('./app/models/room');

io.on('connection', function(socket) {
    
    clientData = {
        user: {
            _id: null,
            username: null,
            avatar: null,
        },
        room: null
    };
    socket.clientData = clientData;

    socket.on('disconnect', function() {
        // user offline
        setOnline(socket.clientData.user._id, false);
        // user leave
        socket.leave(socket.currentRoom);
        console.log(socket.clientData.user.username + ' ngat ket noi');
        socket.broadcast.emit('server-send-disconnect', socket.clientData.user._id);
    });

    socket.on('client-send-data', function(data) {
        // luu thong tin client
        socket.clientData = data;
        console.log(data.user.username + ' ket noi - room: ' + data.room);

        // goi tin hieu online
        socket.broadcast.emit('server-send-connect', socket.clientData.user._id);

        // set online
        setOnline(data.user._id, true);

        // join room
        if (socket.clientData.type == 'p') {
            // char ca nhan -> roomName = user1|user2
            var roomName = createRoomName(data.user.username, data.room);
        } else {
            // chat room -> roomName = roomId
            var roomName = data.room;
        }
        socket.join(roomName);
        socket.currentRoom = roomName;

        if (socket.clientData.type == 'g') {
            // create room
            Room.findOne({ _id: socket.clientData.room }).populate('members.member', '-password').exec(function(err, res) {
                if (err) console.log(err);
                if (res !== null) {
                    socket.emit('client-send-room-name', res.name);
                    // room available
                    Room.findOne({ _id: socket.clientData.room, 'members.member': socket.clientData.user._id }).exec(function(err, res) {
                        if (err) console.log(err);
                        if (res == null) {
                            // chua tham gia -> push
                            Room.update({ _id: socket.clientData.room }, {
                                $push: {
                                    members: {
                                        member: socket.clientData.user._id
                                    }
                                } 
                            }, function(err, res) {
                                if (err) console.log(err);
                                console.log(socket.clientData.user.username + ' join room thanh cong');
                            });
                        } else {
                            console.log(socket.clientData.user.username + ' da tham gia room');
                        }
                    });
                    socket.emit('server-send-list-member', res.members);
                } else {
                    // room not available
                    console.log('Rom: ' + socket.clientData.room + ' khong ton tai');
                }
            });
        }

        Message.find({ room: roomName }).populate('sender', '-password').exec(function(err, res) {
            if (err) console.log(err);
            // console.log(res);
            socket.emit('server-send-list-message', res);
        });

        // server send list user
        User.find({}, '-password').exec(function(err, res) {
            // console.log(res);
            if (err) console.log(err);
            else socket.emit('server-send-list-user', res);
        });

        // server send list room
        Room.find({}).populate('members.member', '-password').exec(function(err, res) {
            if (err) console.log(err);
            else socket.emit('server-send-list-room', res);
        });
    });

    socket.on('client-send-message', function(data) {
        console.log(data);
        var message = {
            sender: socket.clientData.user._id,
            content: data,
            room: socket.currentRoom,
            createdAt: new Date(),
        };
        console.log(message);
        console.log(socket.currentRoom);
        Message.create(message, function(err, res) {
            if (err) console.log(err);
            message.sender = socket.clientData.user;
            io.sockets.in(socket.currentRoom).emit('server-send-message', message);
        });
    });

    // create room
    socket.on('client-send-create-room', function(data) {
        var room = {
            name: data,
            members: {
                member: socket.clientData.user._id
            }
        };
        Room.create(room, function(err, res) {
            if (err) console.log(err);
            console.log('Tao room thanh cong: ' + data);
            io.sockets.emit('server-send-create-room', res);
            socket.emit('server-send-create-room-success', res);
        });
    });

    // ui custom
    socket.on('client-send-update-show-main-right', function(data) {
        User.update({ _id: socket.clientData.user._id }, {
            $set: { showMainRight: data }
        }, function(err, res) {
            if (err) console.log(err);
        });
    });

    socket.on('client-send-update-room-avatar', function(data) {
        io.sockets.emit('server-send-update-room-avatar', data);
    });

});

function setOnline(userId, value) {
    User.update({ _id: userId }, { $set: { online: value } }, function(err, res) {
        if (err) console.log(err);
    });
}

function createRoomName(s1, s2) {
    if (s1 < s2) {
        return s1 + '_' + s2;
    }
    else if (s1 > s2) {
        var tmp = s1;
        s1 = s2;
        s2 = tmp;
        return s1 + '_' + s2;
    }
    else {
        return s1 + '_' + s2;
    }
}