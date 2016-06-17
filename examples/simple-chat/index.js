/* eslint-env browser */
/* global Lime */
/* global MessagingHubClient */
/* global utils */
(function(window) {
    'use strict';

    // buttons
    var connectButton = document.getElementById('connect-button');
    var disconnectButton = document.getElementById('disconnect-button');

    // input elements for connection
    var identityInput = document.getElementById('identity-input');
    var passwordInput = document.getElementById('password-input');
    var uriInput = document.getElementById('uri-input');
    // input elements for messages
    var messageToInput = document.getElementById('message-to-input');
    var messageContentInput = document.getElementById('message-content-input');

    //var clientChannel;
    var messagingHubClient;
    var identity;
    var password;
    var uri;

    function createClient(uri, identity, password){
        messagingHubClient = new MessagingHubClient(uri, new Lime.WebSocketTransport(true));
        messagingHubClient.connect(identity, btoa(password))
        .then(setConnectedState)
        .catch(function(err) {utils.logMessage('An error occurred: ' + err); return; });

        messagingHubClient.addMessageReceiver('application/json', function(message) {
            utils.logLimeMessage(message, 'Message received');
        });

        messagingHubClient.addNotificationReceiver('received', function(notification) {
            utils.logLimeNotification(notification, 'Notification received');
        });

        messagingHubClient.addNotificationReceiver('dispatched', function(notification) {
            utils.logLimeNotification(notification, 'Notification received');
        });

        messagingHubClient.addNotificationReceiver('consumed', function(notification) {
            utils.logLimeNotification(notification, 'Notification received');
        });
    }

    function setConnectedState(){
        connectButton.disabled = true;
        disconnectButton.disabled = false;
        utils.logMessage('Client connected');
    }

    function setDisconnectedState(){
        connectButton.disabled = false;
        disconnectButton.disabled = true;
        utils.logMessage('Client disconnected');
    }

    window.connect = function() {
        utils.checkMandatoryInput(identityInput);
        utils.checkMandatoryInput(uriInput);

        identity = identityInput.value;
        password = passwordInput.value;
        uri = uriInput.value;

        createClient(uri, identity, password);
    };

    window.disconnect = function() {
        messagingHubClient.close();
        setDisconnectedState();
    };

    window.sendMessage = function() {
        var message = {
            id: utils.newGuid(),
            to: messageToInput.value,
            type: 'text/plain',
            content: messageContentInput.value
        };

        messagingHubClient.sendMessage(message);
        utils.logLimeMessage(message, 'Message sent');
    };

    window.ping = function(){
        var pingCommand = {
            id: utils.newGuid(),
            uri: '/ping',
            method: 'get'
        };

        messagingHubClient.sendCommand(pingCommand)
        .then(function(commandResponse) {
            utils.logLimeCommand(pingCommand, 'Ping sent');
            utils.logLimeCommand(commandResponse, 'Ping response');
        })
        .catch(function(err) {
            utils.logMessage('An error occurred: ' + err);
        });
    };
})(this);