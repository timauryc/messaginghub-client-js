import Lime from 'lime-js';
import {Base64} from 'js-base64';

const identity = (x) => x;

export default class MessagingHubClient {

    get uri() { return this._uri; }

    // MessagingHubClient :: String -> Transport? -> MessagingHubClient
    constructor(uri, transport) {
        this._uri = uri;
        this._transport = transport;
        this._clientChannel = new Lime.ClientChannel(this._transport, true, true);

        this._messageReceivers = [];
        this._notificationReceivers = [];
        this._commandResolves = {};

        this._clientChannel.onMessage = (message) =>
            this._messageReceivers
                .forEach((receiver) => receiver.predicate(message) && receiver.callback(message));
        this._clientChannel.onNotification = (notification) =>
            this._notificationReceivers
                .forEach((receiver) => receiver.predicate(notification) && receiver.callback(notification));
        this._clientChannel.onCommand = (c) => (this._commandResolves[c.id] || identity)(c);
    }

    // connectWithGuest :: String -> String -> Promise Session
    connectWithGuest(identifier) {
        if (!identifier) throw new Error('The identifier is required');
        return this._transport
            .open(this.uri)
            .then(() => {
                let authentication = new Lime.GuestAuthentication();
                return this._clientChannel.establishSession(Lime.SessionEncryption.NONE, Lime.SessionCompression.NONE, identifier + '@msging.net', authentication, '');
            })
            .then((session) => {
                return this._sendPresenceCommand().then(() => session);
            });
    }

    // connectWithPassword :: String -> String -> Promise Session
    connectWithPassword(identifier, password) {
        if (!identifier) throw new Error('The identifier is required');
        if (!password) throw new Error('The password is required');
        return this._transport
            .open(this.uri)
            .then(() => {
                let authentication = new Lime.PlainAuthentication();
                authentication.password = Base64.encode(password);
                return this._clientChannel.establishSession(Lime.SessionEncryption.NONE, Lime.SessionCompression.NONE, identifier + '@msging.net', authentication, '');
            })
            .then((session) => {
                return this._sendPresenceCommand().then(() => session);
            });
    }

    // connectWithKey :: String -> String -> Promise Session
    connectWithKey(identifier, key) {
        if (!identifier) throw new Error('The identifier is required');
        if (!key) throw new Error('The key is required');
        return this._transport
            .open(this.uri)
            .then(() => {
                let authentication = new Lime.KeyAuthentication();
                authentication.key = key;
                return this._clientChannel.establishSession(Lime.SessionEncryption.NONE, Lime.SessionCompression.NONE, identifier + '@msging.net', authentication, '');
            })
            .then((session) => {
                return this._sendPresenceCommand().then(() => session);
            });
    }

    _sendPresenceCommand() {
        // TODO: use default Lime solution for Presences when available
        return this.sendCommand({
            id: Lime.Guid(),
            method: Lime.CommandMethod.SET,
            uri: '/presence',
            type: 'application/vnd.lime.presence+json',
            resource: {
                status: 'available',
                routingRule: 'identity'
            }
        });
    }

    // close :: Promise ()
    close() {
        return this._clientChannel.sendFinishingSession();
    }

    // sendMessage :: Message -> ()
    sendMessage(message) {
        this._clientChannel.sendMessage(message);
    }

    // sendNotification :: Notification -> ()
    sendNotification(notification) {
        this._clientChannel.sendNotification(notification);
    }

    // sendCommand :: Command -> Promise Command
    sendCommand(command) {
        this._clientChannel.sendCommand(command);
        return new Promise((resolve) => {
            this._commandResolves[command.id] = (c) => {
                resolve(c);
                delete this._commandResolves[command.id];
            };
        });
    }

    // addMessageReceiver :: String -> (Message -> ()) -> Function
    addMessageReceiver(predicate, callback) {
        if (typeof predicate !== 'function') {
            if (predicate === true || !predicate) {
                predicate = () => true;
            } else {
                const value = predicate;
                predicate = (message) => message.type === value;
            }
        }
        this._messageReceivers.push({ predicate, callback });
        return () => this._messageReceivers = this._messageReceivers.filter((r) => r.predicate !== predicate && r.callback !== callback);
    }

    clearMessageReceivers() {
        this._messageReceivers = [];
    }

    // addNotificationReceiver :: String -> (Notification -> ()) -> Function
    addNotificationReceiver(predicate, callback) {
        if (typeof predicate !== 'function') {
            if (predicate === true || !predicate) {
                predicate = () => true;
            } else {
                const value = predicate;
                predicate = (notification) => notification.event === value;
            }
        }
        this._notificationReceivers.push({ predicate, callback });
        return () => this._notificationReceivers = this._notificationReceivers.filter((r) => r.predicate !== predicate && r.callback !== callback);
    }

    clearNotificationReceivers() {
        this._notificationReceivers = [];
    }
}
