var mongoose = require('mongoose');
var bcrypt = require('bcrypt-nodejs');

var userSchema = mongoose.Schema({
    username: String,
    password: String,
    online: {
        type: Boolean,
        default: false
    },
    showMainRight: {
        type: Boolean,
        default: false
    },
    avatar: {
        type: String,
        default: 'data:image/png;base64,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'
    },
    fullname: String,
    email: String,
    phone: String,
});

userSchema.methods.generateHash = function(password) {
    return bcrypt.hashSync(password, bcrypt.genSaltSync(8), null);
};

userSchema.methods.validPassword = function(password) {
    return bcrypt.compareSync(password, this.password);
};

module.exports = mongoose.model('User', userSchema);