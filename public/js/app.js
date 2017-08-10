// client send data: user, room
socket.emit('client-send-data', clientData);

// server send message
socket.on('server-send-message', function(data) {
    renderMessage(data);
});

socket.on('server-send-list-message', function(data) {
    data.forEach(function(e) {
        renderMessage(e);
    });
});

socket.on('server-send-list-user', function(data) {
    $('#listUser').html('');
    if (data.length !== 0) {
        data.forEach(function(e) {
            renderUser(e);
        });
    } else {
        $('#listUser').html('<div style="padding-left: 10px;">Không tìm thấy người nào</div>'); 
    }
});

socket.on('server-send-list-room', function(data) {
    $('#listRoom').html('');
    if (data.length !== 0) {
        data.forEach(function(e) {
            renderRoom(e);
        });
    } else {
        $('#listRoom').html('<div style="padding-left: 10px;">Không tìm thấy nhóm nào</div>');
    }
});

socket.on('server-send-list-member', function(data) {
    data.forEach(function(e) {
        var onlineText = e.member.online ? 'Online' : 'Offline';
        var online = '<div class="status ' + (e.member.online) + ' ' + (e.member._id) + '">' + onlineText + '</div>';
        var html = `
            <a href="/m/` + e.member.username + `/p">
                <div class="group">
                    <img src="` + e.member.avatar + `" alt="" class="avatar" />
                    <div class="info">
                        <h4 class="name">` + e.member.username + `</h4>
                        ` + online + `
                    </div>   
                </div>
            </a>
        `;
        $('#listMemberInRoom').append(html);
    });
});

socket.on('client-send-room-name', function(data) {
    $('#currentRoom').html(data);
    $('#roomName').html(data);
});

socket.on('server-send-create-room', function(data) {
    renderRoom(data);
});

socket.on('server-send-create-room-success', function(data) {
    window.location.href = 'http://localhost:3000/m/' + data._id + '/g';
});

socket.on('server-send-update-room-avatar', function(data) {
    $('#roomAvatar').attr('src', data);
});

socket.on('server-send-disconnect', function(data) {
    $('.status.' + data).removeClass('true').html('Offline');
});
socket.on('server-send-connect', function(data) {
    $('.status.' + data).removeClass('false').addClass('true').html('Online');
});

function renderMessage(data) {
    var lastSender = $( "#listMessage > div.message-group:last" ).attr("data-sender");
    sameLastMessage = false;
    if (lastSender === data.sender._id) {
        // neu tin nhan truoc la cua toi -> hien thi tin nhan moi trong .message-group
        const html = `
            <div class="including">
                <div class="message">` + emojione.shortnameToImage(data.content) + `</div>
            </div>`;

        $("#listMessage > div.message-group:last").find('.message:last').addClass('message-bottom');
        $("#listMessage > div.message-group:last").find('#messages').append(html);

        sameLastMessage = true;
    } else {
        // tin nhan moi
        if (data.sender._id == clientData.user._id) {
            // tin nhan cua toi
            const html = `
                <div class="message-group me" data-sender="` + data.sender._id + `">
                    <div class="message-body">
                        <div id="messages">
                            <div class="including">
                                <div class="message">` + emojione.shortnameToImage(data.content) + `</div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            $('#listMessage').append(html);
        } else {
            // tin nhan moi
            const html =
            `<div class="message-group" data-sender="` + data.sender._id + `">
                <img src="` + data.sender.avatar + `" class="message-avatar" />
                <div class="message-body">
                    <h4 class="message-username">` + data.sender.username + `</h4>
                    <div id="messages">
                        <div class="including">
                            <div class="message">` + emojione.shortnameToImage(data.content) + `</div>
                        </div>
                    </div>
                </div>
            </div>`;
            $('#listMessage').append(html);
        }
    }

    if (sameLastMessage) {
        $( "#listMessage > div.message-group:last" ).find('.message:last').removeClass('message-bottom');
        $( "#listMessage > div.message-group:last" ).find('.message:last').addClass('message-top');
    }

    $('.main-left .content').scrollTop($('.main-left .content').prop('scrollHeight'));
};

function renderUser(data) {
    var onlineText = data.online ? 'Online' : 'Offline';
    var online = '<div class="status ' + (data.online) + ' ' + (data._id) + '">' + onlineText + '</div>';
    var html = `
        <a href="/m/` + data.username + `/p">
            <div class="group">
                <img src="` + data.avatar + `" alt="" class="avatar" />
                <div class="info">
                    <h4 class="name">` + data.username + `</h4>
                    ` + online + `
                </div>   
            </div>
        </a>
    `;
    $('#listUser').append(html);
}

function renderRoom(data) {
    var html = `
        <a href="/m/` + data._id + `/g">
            <div class="group">
                <img src="` + data.avatar + `" alt="" class="avatar" />
                <div class="info">
                    <h4 class="name">` + data.name + `</h4>
                </div>
            </div>
        </a>
    `;
    $('#listRoom').append(html);
}

function htmlSpecialChars(text) {
    return text
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
    .replace(/</g, "&lt")
    .replace(/>/g, "&gt"); 
}

$(document).ready(function() {
    $('#txtMessage').keyup(function(e) {
        if (e.which == 13) {
            console.log('SEND!!');
            var content = $(this).val();

            if (content !== '') {
                socket.emit('client-send-message', htmlSpecialChars(content));
            }
            $(this).val('');
        }
    });
    $('#a-show-main-right').click(function() {
        $('.main-right').toggle(0, function() {
            if($(this).is(':hidden')) {
                console.log('This element is hidden.');
                $('.main-left').addClass('full');
                socket.emit('client-send-update-show-main-right', false);
            }
            else {
                console.log('This element is visible.');
                $('.main-left').removeClass('full');
                socket.emit('client-send-update-show-main-right', true);
            }
        });
    });
    $('#btnCreateRoom').click(function() {
        console.log('Create Room!!!!');
        var roomName = $('#txtRoomName').val();
        if (roomName !== '') {
            socket.emit('client-send-create-room', roomName);
        }
    });
    var inputMessage = $("#txtMessage").emojioneArea({
        events: {
            keyup: function (editor, event) {
                if (event.which == 13) {
                    var content = inputMessage[0].emojioneArea.getText();
                    console.log('|' + content + '|');
                    // if (content !== '') {
                        inputMessage[0].emojioneArea.setText('');
                    //     socket.emit('client-send-message', htmlSpecialChars(content));
                    // }
                }
            },
        }
    });
});