var mongoose = require('mongoose');

var messageSchema = mongoose.Schema({
    sender: {
        type: String,
        ref: 'User'
    },
    content: String,
    createdAt: Date,
    room: String
});

module.exports = mongoose.model('Message', messageSchema);