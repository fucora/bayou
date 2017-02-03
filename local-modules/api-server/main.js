// Copyright 2016-2017 the Bayou Authors (Dan Bornstein et alia).
// Licensed AS IS and WITHOUT WARRANTY under the Apache License,
// Version 2.0. Details: <http://www.apache.org/licenses/LICENSE-2.0>

import JsonUtil from 'json-util';
import PropertyIter from 'property-iter';
import RandomId from 'random-id';
import SeeAll from 'see-all';
import Typecheck from 'typecheck';
import WebsocketCodes from 'websocket-codes';

import MetaHandler from './MetaHandler';

/** Logger. */
const log = new SeeAll('api');

/**
 * Direct handler for API requests. This is responsible for interpreting
 * and responding to incoming websocket data. It mostly bottoms out by calling
 * on a target object, which performs the actual services. That is, this class
 * is plumbing.
 */
export default class ApiServer {
  /**
   * Constructs an instance. Each instance corresponds to a separate client
   * connection. As a side effect, the contructor attaches the constructed
   * instance to the websocket (as an event listener).
   *
   * @param {WebSocket} ws A websocket instance corresponding to the connection.
   * @param {object} target The target to provide access to.
   */
  constructor(ws, target) {
    /** The Websocket for the client connection. */
    this._ws = ws;

    /** Short ID string used to identify this connection in logs. */
    this._connectionId = RandomId.make('conn');

    /**
     * Schemas for each target object (see `_targets`, below), initialized
     * lazily.
     */
    this._schemas = new Map();

    /**
     * The targets to provide access to. `main` is the object providing the main
     * functionality, and `meta` provides meta-information and meta-control.
     * **Note:** We can only fill in `meta` after this instance variable is
     * otherwise fully set up, since the `MetaHandler` constructor will end up
     * accessing it. (Whee!)
     */
    this._targets = new Map();
    this._targets.set('main', target);
    this._targets.set('meta', new MetaHandler(this));

    /** Count of messages received. Used for liveness logging. */
    this._messageCount = 0;

    /** Logger which includes the connection ID as a prefix. */
    this._log = log.withPrefix(`[${this._connectionId}]`);

    ws.on('message', this._handleMessage.bind(this));
    ws.on('close', this._handleClose.bind(this));
    ws.on('error', this._handleError.bind(this));

    this._log.info('Open.');
  }

  /**
   * Handles a `message` event coming from the underlying websocket. For valid
   * methods, this calls the method implementation and handles both the case
   * where the result is a simple value or a promise.
   *
   * @param {string} msg Incoming message, in JSON string form.
   */
  _handleMessage(msg) {
    this._messageCount++;
    if ((this._messageCount % 25) === 0) {
      this._log.info(`Handled ${this._messageCount} messages.`);
    }

    msg = JsonUtil.parseFrozen(msg);
    this._log.detail('Message:', msg);

    let target     = this._targets.get('main');
    let targetName = 'main';
    let methodImpl = null;

    try {
      Typecheck.objectWithExactKeys(msg, ['id', 'action', 'name', 'args']);
      Typecheck.intMin(msg.id, 0);
      Typecheck.string(msg.action);
      Typecheck.string(msg.name);
      Typecheck.array(msg.args);

      if (msg.action === 'meta') {
        // The `meta` action gets treated as a `call` on the meta-handler.
        target     = this._targets.get('meta');
        targetName = 'meta';
      }
    } catch (e) {
      target = this;
      methodImpl = this._error_bad_message;
      // Remake the message such that it can ultimately be dispatched (to
      // produce the desired error response).
      msg = {
        id:     -1,
        action: 'error',
        name:   'unknown-name',
        args:   [msg]
      };
    }

    switch (msg.action) {
      case 'error': {
        // Nothing extra to do. We'll fall through and dispatch to the error
        // implementation which was already set up.
        break;
      }

      case 'call':
      case 'meta': {
        const name = msg.name;
        const schema = this.getSchema(targetName);
        if (schema[name] === 'method') {
          // Listed in the schema as a method. So it exists, is public, is in
          // fact bound to a function, etc.
          methodImpl = target[name];
        }
        break;
      }

      default: {
        target = this;
        methodImpl = this._error_bad_action;
        break;
      }
    }

    if (methodImpl === null) {
      target = this;
      methodImpl = this._error_unknown_method;
    }

    // Function to send a response. Arrow syntax so that `this` is usable.
    const respond = (result, error) => {
      const response = {id: msg.id};
      if (error) {
        response.ok = false;
        response.error = error.message;
      } else {
        response.ok = true;
        response.result = result;
      }

      this._log.detail('Response:', response);
      if (error) {
        this._log.detail('Error:', error);
      }
      this._ws.send(JSON.stringify(response));
    };

    try {
      // Note: If the method implementation returns a non-promise, then the
      // `resolve()` call operates promptly.
      Promise.resolve(methodImpl.apply(target, msg.args)).then(
        (result) => { respond(result, null); },
        (error) => { respond(null, error); });
    } catch (error) {
      respond(null, error);
    }
  }

  /**
   * Handles a `close` event coming from the underlying websocket.
   *
   * @param {number} code The reason code for why the socket was closed.
   * @param {string} msg The human-oriented description for the reason.
   */
  _handleClose(code, msg) {
    const codeStr = WebsocketCodes.close(code);
    const msgStr = msg ? `: ${msg}` : '';
    this._log.info(`Close: ${codeStr}${msgStr}`);
  }

  /**
   * Handles an `error` event coming from the underlying websocket.
   *
   * @param {object} error The error event.
   */
  _handleError(error) {
    this._log.info('Error:', error);
  }

  /**
   * API error: Bad value for `message` in call payload (invalid shape).
   *
   * @param {object} msg_unused The original message.
   */
  _error_bad_message(msg_unused) {
    throw new Error('bad_message');
  }

  /**
   * API error: Bad value for `action` in call payload (not a recognized value).
   *
   * @param {object} msg_unused The original message.
   */
  _error_bad_action(msg_unused) {
    throw new Error('bad_action');
  }

  /**
   * API error: Unknown (undefined) method.
   *
   * @param {object} msg_unused The original message.
   */
  _error_unknown_method(msg_unused) {
    throw new Error('unknown_method');
  }

  /**
   * Generates a schema for the given object. This is a map of the public
   * methods callable on the given object, _excluding_ those with an underscore
   * prefix, those named `constructor`, and those defined on the root `Object`
   * prototype. The result is a map from the names to the value `'method'`. (In
   * the future, the values might become embiggened.)
   *
   * @param {object} obj Object to interrogate.
   * @returns {object} The method map for `obj`.
   */
  static _makeSchemaFor(obj) {
    const result = {};

    for (const desc of new PropertyIter(obj).skipObject().onlyMethods()) {
      const name = desc.name;

      if (name.match(/^_/) || (name === 'constructor')) {
        // Because we don't want properties whose names are prefixed with `_`,
        // and we don't want to expose the constructor function.
        continue;
      }

      result[name] = 'method';
    }

    return result;
  }

  /**
   * The connection ID.
   */
  get connectionId() {
    return this._connectionId;
  }

  /**
   * Gets the target associated with the indicated name. This will throw an
   * error if the named target does not exist.
   *
   * @param {string} name The target name.
   * @returns {object} The so-named target.
   */
  getTarget(name) {
    const result = this._targets.get(name);

    if (result === undefined) {
      throw new Error(`No such target: \`${name}\``);
    }

    return result;
  }

  /**
   * Gets the schema associated with the target of the indicated name. This will
   * throw an error if the named target does not exist.
   *
   * @param {string} name The target name.
   * @returns {object} Schema of the target. This is a (poorly-specified) object
   *    mapping property names to descriptors.
   */
  getSchema(name) {
    const target = this.getTarget(name); // Will throw if `name` is not bound.
    let   schema = this._schemas.get(name);

    if (schema === undefined) {
      schema = ApiServer._makeSchemaFor(target);
      this._schemas.set(name, schema);
    }

    return schema;
  }
}
