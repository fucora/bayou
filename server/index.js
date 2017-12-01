// Copyright 2016-2017 the Bayou Authors (Dan Bornstein et alia).
// Licensed AS IS and WITHOUT WARRANTY under the Apache License,
// Version 2.0. Details: <http://www.apache.org/licenses/LICENSE-2.0>

// This `import` patches Node's backtrace handler so as to make it respect
// source maps (and so produce traces with proper source position info for
// compiled files). We do this as the very first thing upon running, so that
// any exceptions thrown during bootstrap have a reasonable chance of getting
// displayed with an accurate backtrace.
import 'source-map-support/register';

// These `import`s complete the setup of the Babel runtime.
import 'babel-core/register';
import 'babel-polyfill';

import path from 'path';
import minimist from 'minimist';

import { Application } from 'app-setup';
import { ClientBundle } from 'client-bundle';
import { DevMode } from 'dev-mode';
import { Dirs, ProductInfo, ServerEnv } from 'env-server';
import { Hooks } from 'hooks-server';
import { Delay } from 'promise-util';
import { Logger } from 'see-all';
import { FileSink, ServerSink } from 'see-all-server';
import { ClientTests, ServerTests } from 'testing-server';


/** {Logger} Logger for this file. */
const log = new Logger('main');

/** {boolean} Error during argument processing? */
let argError = false;

/**
 * {object} Parsed command-line options. **Note:** The `slice` gets rid of the
 * `node` binary name and the name of the initial script (that is, this file).
 */
const opts = minimist(process.argv.slice(2), {
  boolean: ['client-bundle', 'client-test', 'dev', 'help', 'server-test'],
  string: ['prog-name', 'test-out'],
  alias: {
    'h': 'help'
  },
  stopEarly: true,
  unknown: (arg) => {
    // eslint-disable-next-line no-console
    console.log(`Unrecognized option: ${arg}`);
    argError = true;
    return false;
  }
});

/** {boolean} Client bundle build mode? */
const clientBundleMode = opts['client-bundle'];

/** {boolean} Client test mode? */
const clientTestMode = opts['client-test'];

/** {boolean} Dev mode? */
const devMode = opts['dev'];

/** {boolean} Server test mode? */
const serverTestMode = opts['server-test'];

/** {string} Path for test output. */
let testOut = opts['test-out'];

/** {boolean} Want help? */
const showHelp = opts['help'];

if ((clientBundleMode + clientTestMode + devMode + serverTestMode) > 1) {
  // eslint-disable-next-line no-console
  console.log('Cannot specify multiple mode options.');
  argError = true;
} else if (testOut) {
  if (!(clientTestMode || serverTestMode)) {
    // eslint-disable-next-line no-console
    console.log('Cannot specify `--test-out` except when running in a test mode.');
    argError = true;
  } else {
    testOut = path.resolve(testOut);
  }
}

if (showHelp || argError) {
  const progName = opts['prog-name'] || path.basename(process.argv[1]);
  [
    'Usage:',
    '',
    `${progName} [--dev | --client-bundle | --client-test | --server-test ]`,
    '  [--test-out=<path>]',
    '',
    '  Run the project.',
    '',
    '  --client-bundle',
    '    Just build a client bundle, and report any errors encountered.',
    '  --client-test',
    '    Just run the client tests (via headless Chrome), and report any errors',
    '    encountered.',
    '  --dev',
    '    Run in development mode, for interactive development without having',
    '    to restart when client code changes, and to automatically exit when',
    '    server code changes. (The `develop` script automatically rebuilds and',
    '    restarts when the latter happens.)',
    '  --server-test',
    '    Just run the server tests, and report any errors encountered.',
    '  --test-out=<path>',
    '    Where to write the output from a test run in addition to writing to the',
    '    console. (If not specified, will just write to the console.)',
    '',
    `${progName} [--help | -h]`,
    '  Display this message.'
  ].forEach((line) => {
    // eslint-disable-next-line no-console
    console.log(line);
  });
  process.exit(argError ? 1 : 0);
}

/**
 * Runs the system. `mode` options are:
 *
 * * `prod` &mdash; Normal production run.
 * * `dev` &mdash; Local development.
 * * `test` &mdash; Configured for live testing.
 *
 * @param {string} mode The mode as described above.
 * @returns {Int} The port being listened on, once listening has started.
 */
async function run(mode) {
  // Set up the server environment bits (including, e.g. the PID file).
  await ServerEnv.theOne.init();

  // A little spew to identify us.
  const info = ProductInfo.theOne.INFO;
  for (const k of Object.keys(info)) {
    log.info(k, '=', info[k]);
  }

  if (mode === 'dev') {
    // We're in dev mode. This starts the system that live-syncs the client
    // source.
    DevMode.theOne.start();
  }

  Hooks.theOne.run();

  /** The main app server. */
  const theApp = new Application(mode !== 'prod');

  // Start the app!
  return theApp.start(mode === 'test');
}

/**
 * Does a client bundling.
 */
async function clientBundle() {
  try {
    await new ClientBundle().build();
    log.info('');
    log.info('Built client bundles. No errors!');
    process.exit(0);
  } catch (e) {
    log.error(e);
    process.exit(1);
  }
}

/**
 * Does a client testing run.
 */
async function clientTest() {
  // Figure out if there is already a server listening on the designated
  // application port. If not, run one locally in this process.

  const alreadyRunning = await ServerEnv.theOne.isAlreadyRunningLocally();
  let port;

  if (alreadyRunning) {
    port = Hooks.theOne.listenPort;
    log.info(
      'NOTE: There is a server already running on this machine. The client test run\n' +
      '      will issue requests to it instead of trying to build a new test bundle.');
  } else {
    // Start up a server in this process, since we determined that this machine
    // isn't already running one. We run in test mode so that it will pick a
    // free port (instead of assuming the usual one is available; it likely
    // won't be if the tests are running on a shared machine) and will make the
    // `/debug` endpoints available.
    port = await run('test');

    // Wait a few seconds, so that we can be reasonably sure that the request
    // handlers are ready to handle requests. And there's no point in issuing
    // a request until the test code bundle is built, anyway; that takes at
    // least this long (probably longer).
    await Delay.resolve(15 * 1000);
  }

  const anyFailed = await ClientTests.run(port, testOut || null);

  process.exit(anyFailed ? 1 : 0);
}

/**
 * Does a server testing run.
 */
async function serverTest() {
  const anyFailed = await ServerTests.run(testOut || null);

  process.exit(anyFailed ? 1 : 0);
}

process.on('unhandledRejection', (reason, promise_unused) => {
  log.error('Unhandled promise rejection:', reason);

  // Give the system a moment, so it has a chance to actually flush the log,
  // and then exit.
  (async () => {
    await Delay.resolve(250); // 0.25 second.
    process.exit(1);
  })();
});

process.on('uncaughtException', (error) => {
  log.error('Uncaught error:', error);

  // Give the system a moment, so it has a chance to actually flush the log,
  // and then exit.
  (async () => {
    await Delay.resolve(250); // 0.25 second.
    process.exit(1);
  })();
});

// Dispatch to the selected top-level function.

if (clientBundleMode) {
  ServerSink.init(false);
  clientBundle();
} else if (clientTestMode) {
  ServerSink.init(false);
  clientTest();
} else if (serverTestMode) {
  ServerSink.init(false);
  serverTest();
} else {
  ServerSink.init(true);
  new FileSink(path.resolve(Dirs.theOne.LOG_DIR, 'general.log'));
  run(devMode ? 'dev' : 'prod');
}
