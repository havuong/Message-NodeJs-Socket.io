var LocalStrategy = require('passport-local').Strategy;
var User = require('../app/models/user');

module.exports = function(passport) {
    passport.serializeUser(function(user, done) {
        done(null, user.id);
    });
    
    passport.deserializeUser(function(id, done) {
        User.findById(id, function(err, user) {
            done(err, user);
        });
    });
    
    passport.use('local-register', new LocalStrategy({
        usernameField : 'username',
        passwordField : 'password',
        passReqToCallback : true
    },
    function(req, username, password, done) {
        process.nextTick(function() {
            User.findOne({ 'username': username }, function(err, user) {
                if (err) return done(err);
                if (user) return done(null, false, req.flash('registerMessage', 'Tài khoản đã được sử dụng'));
                else {
                    var newUser = new User();
                    newUser.username = username;
                    newUser.password = newUser.generateHash(password);
                    newUser.save(function(err) {
                        if (err) throw err;
                        return done(null, newUser);
                    });
                }
            });    
        });
    }));

    passport.use('local-login', new LocalStrategy({
        usernameField : 'username',
        passwordField : 'password',
        passReqToCallback : true
    },
    function(req, username, password, done) {
        User.findOne({ 'username': username }, function(err, user) {
            if (err) return done(err);
            if (!user) return done(null, false, req.flash('loginMessage', 'Tài khoản hoặc mật khẩu không đúng'));
            if (!user.validPassword(password)) return done(null, false, req.flash('loginMessage', 'Tài khoản hoặc mật khẩu không đúng'));
            return done(null, user);
        });
    }));
};
