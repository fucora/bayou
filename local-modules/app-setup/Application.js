// Copyright 2016-2017 the Bayou Authors (Dan Bornstein et alia).
// Licensed AS IS and WITHOUT WARRANTY under the Apache License,
// Version 2.0. Details: <http://www.apache.org/licenses/LICENSE-2.0>

import chalk from 'chalk';
import express from 'express';
import express_ws from 'express-ws';
import fs from 'fs';
import morgan from 'morgan';
import path from 'path';

import { PostConnection, TargetMap, WsConnection } from 'api-server';
import { ClientBundle } from 'client-bundle';
import { SeeAll } from 'see-all';
import { Dirs } from 'server-env';

import DebugTools from './DebugTools';

/** Logger. */
const log = new SeeAll('app');

/** What port to listen for connections on. */
const PORT = 8080;

/**
 * Web server for the application. This serves all HTTP(S) requests, including
 * websocket requests.
 */
export default class Application {
  /**
   * Constructs an instance.
   *
   * @param {DocServer} doc The document managed by the instance.
   * @param {boolean} devMode Whether or not to run in dev mode. If `true`, this
   *   activates `/debug/*` endpoints.
   */
  constructor(doc, devMode) {
    /** {DocServer} The document. */
    this._doc = doc;

    /**
     * {TargetMap} All of the objects we provide access to via the API.
     *
     * **TODO:** This will eventually grow beyond a single target.
     */
    this._targets = TargetMap.singleTarget(doc);

    /** The underlying webserver run by this instance. */
    this._app = express();

    this._addRequestLogging();
    this._addRoutes();

    if (devMode) {
      this._addDevModeRoutes();
    }
  }

  /**
   * Starts up the server.
   */
  start() {
    this._app.listen(PORT, () => {
      log.info(`Now listening on port ${PORT}.`);
    });
  }

  /**
   * Sets up logging for webserver requests.
   */
  _addRequestLogging() {
    const app = this._app;

    // Stream to write to, when logging to a file.
    const logStream = fs.createWriteStream(
      path.resolve(Dirs.VAR_DIR, 'access.log'),
      {flags: 'a'});

    // These log regular (non-websocket) requests at the time of completion,
    // including a short colorized form to the console and a longer form to a
    // file.

    // This is a status-aware logger, roughly based on morgan's built-in `dev`
    // style.
    function shortColorLog(tokens_unused, req, res) {
      const status    = res.statusCode || 0;
      const statusStr = res.statusCode || '-  ';
      const colorFn   = Application._colorForStatus(status);

      let contentLength = res.get('content-length');
      if (contentLength === undefined) {
        contentLength = '-';
      } else if (contentLength > (1024 * 1024)) {
        contentLength = Math.round(contentLength / 1024 / 1024 * 10) / 10;
        contentLength += 'M';
      } else if (contentLength > 1024) {
        contentLength = Math.round(contentLength / 1024 * 10) / 10;
        contentLength += 'K';
      } else {
        // Coerce it to a string.
        contentLength = `${contentLength}`;
      }

      if (contentLength.length < 7) {
        contentLength += ' '.repeat(7 - contentLength.length);
      }

      return `${colorFn(statusStr)} ${contentLength} ${req.method} ${req.originalUrl}`;
    }

    app.use(morgan(shortColorLog, {
      stream: log.infoStream
    }));

    app.use(morgan('common', {
      stream: logStream
    }));

    // These log websocket requests, at the time of request start (not at the
    // time of completion because these are long-lived requests).

    // Log skip function: Returns `true` for anything other than a websocket
    // request.
    function skip(req, res_unused) {
      return (req.get('upgrade') !== 'websocket');
    }

    // Logger which is meant to match the formatting of `shortColorLog` above.
    function shortWsLog(tokens_unused, req, res_unused) {
      // exress-ws appends a pseudo-path `/.websocket` to the end of websocket
      // requests.
      const url = req.originalUrl.replace(/\/\.websocket$/, '');

      return `-   -       WS ${url}`;
    }

    app.use(morgan(shortWsLog, {
      stream:    log.infoStream,
      immediate: true,
      skip
    }));

    app.use(morgan('common', {
      stream:    logStream,
      immediate: true,
      skip
    }));
  }

  /**
   * Sets up the webserver routes.
   */
  _addRoutes() {
    const app = this._app;

    // Make the webserver able to handle websockets.
    express_ws(app);

    // Map Quill files into `/static/quill`. This is used for CSS files but not for
    // the JS code; the JS code is included in the overall JS bundle file.
    app.use('/static/quill',
      express.static(path.resolve(Dirs.CLIENT_DIR, 'node_modules/quill/dist')));

    // Use Webpack to serve a JS bundle.
    app.get('/static/bundle.js', new ClientBundle().requestHandler);

    // Find HTML files and other static assets in `client/assets`. This includes the
    // top-level `index.html` and `favicon`, as well as stuff under `static/`.
    app.use('/', express.static(path.resolve(Dirs.CLIENT_DIR, 'assets')));

    // Use the `api-server` module to handle POST and websocket requests at
    // `/api`.
    app.post('/api',
      (req, res) => { new PostConnection(req, res, this._targets); });
    app.ws('/api',
      (ws, req_unused) => { new WsConnection(ws, this._targets); });
  }

  /**
   * Adds the dev mode routes.
   */
  _addDevModeRoutes() {
    const app = this._app;
    app.use('/debug', new DebugTools(this._doc).requestHandler);
  }

  /**
   * Given an HTTP status, returns the corresponding `chalk` coloring function,
   * or a no-op function if the status doesn't demand colorization.
   *
   * @param {number} status The HTTP status code.
   * @returns {function} The corresponding coloring function.
   */
  static _colorForStatus(status) {
    if      (status >= 500) { return chalk.red;    }
    else if (status >= 400) { return chalk.yellow; }
    else if (status >= 300) { return chalk.cyan;   }
    else if (status >= 200) { return chalk.green;  }
    else                    { return ((x) => x);   } // No-op by default.
  }
}