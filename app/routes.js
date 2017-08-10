var User = require('./models/user');
var Room = require('./models/room');

module.exports = function(app, passport, upload) {
    app.get('/', notHasUser, function(req, res) {
        User.findOne().exec(function(err, data) {
            if (err) console.log(err);
            else res.redirect('/m/' + data.username + '/p');
        });
    });
    
    app.get('/login', hasUser, function(req, res) {
        res.render('login', { message: req.flash('loginMessage') });
    });
    app.post('/login', passport.authenticate('local-login', {
        successRedirect: '/',
        failureRedirect: '/login',
        failureFlash: true
    }));

    app.get('/register', hasUser, function(req, res) {
        res.render('register', { message: req.flash('registerMessage') });
    });
    app.post('/register', passport.authenticate('local-register', {
        successRedirect: '/',
        failureRedirect: '/register',
        failureFlash : true
    }));

    app.get('/profile', notHasUser, function(req, res) {
        res.render('profile', { user: req.user });
    });
    app.post('/profile', function(req, res, next) {
        // console.log(req.body);
        User.update({ _id: req.user._id }, { $set: req.body }, function(err, data) {
            if (err) console.log(err);
            else res.redirect('/profile');
        });
    });

    app.get("/profile/edit-avatar", notHasUser, function (req, res) {
        res.render('avatar', {
            user: req.user
        });
    });
    app.post('/profile/edit-avatar', function(req, res) {
        User.update({ _id: req.body.userId }, { $set: { avatar: req.body.avatar } }, function(err) {
            if (err) console.log(err);
            else res.end('success');
        });
    });

    app.post('/api/upload', function(req, res) {
        upload(req, res, function(err) {
            if (err) res.end('error');
            else res.end(req.file.filename);
        });
    });

    app.get('/logout', function(req, res) {
        req.logout();
        res.redirect('/');
    });

    app.get('/m/:roomId/:type', notHasUser, function(req, res) {
        if (req.params.type !== 'p' && req.params.type !== 'g') res.redirect('/');
        if (req.params.type == 'g') {
            Room.findOne({ _id: req.params.roomId }).exec(function(err, data) {
                if (err) console.log(err);
                else {
                    res.render('index', {
                        room: req.params.roomId,
                        roomAvatar: data.avatar,
                        user: req.user,
                        type: req.params.type
                    });
                }
            });
        } else {
            res.render('index', {
                room: req.params.roomId,
                roomAvatar: null,
                user: req.user,
                type: req.params.type
            });
        }
        // type = p -> Chat ca nhan
        // type = g -> Char room
    });

    app.post('/room/edit-avatar', function(req, res) {
        Room.update({ _id: req.body.roomId }, { $set: { avatar: req.body.avatar } }, function(err) {
            if (err) console.log(err);
            else res.end('success');
        });
    });

    function notHasUser(req, res, next) {
        if (req.isAuthenticated()) return next();
        res.redirect('/login');
    }
    function hasUser(req, res, next) {
        if (!req.isAuthenticated()) return next();
        res.redirect('/');
    }
}