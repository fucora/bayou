Quillex
=======

A little [Quill](https://quilljs.com/) demo application. The code is set up to
make it straightforward to customize. Salient details:

* Quill and its dependencies get built from source, instead of being used in
  the precompiled distro form which Quill provides as a convenience. This makes
  it possible to use Quill and Parchment (and the other dependencies) from
  custom code without ending up with duplicated code and punned definitions.

* All of the client-side code gets transformed into a single bundle, using
  [Webpack](https://webpack.github.io/). It is set up in a "live development"
  configuration, where changes to source files cause the bundle to be recompiled
  on the fly.

* Custom client code can be written in either ES2017 (with a `.js` suffix) or
  [TypeScript](https://www.typescriptlang.org/) (with a `.ts` suffix). Custom
  server code can be written in ES2017. Modern `import` syntax works both for
  separate modules (e.g., `import Quill from 'quill'`) and local files (e.g.,
  `import { thing } from './thing'`).

  * ES2017 is compiled into conservative JavaScript by
    [Babel](https://babeljs.io/).

  * TypeScript is compiled into conservative JavaScript by the standard
    TS compiler, hooked up to Webpack using
    [`ts-loader`](https://www.npmjs.com/package/ts-loader).

* [Express](https://expressjs.com/) is used as the HTTP server and associated
  plumbing.

* The product defines and uses a structured (though as yet not particularly
  well-specified) API for communication between client and server. It uses a
  websocket for transport, using it to pass JSON-encoded API calls and
  responses. As of this writing, the server side only _barely_ does anything
  nontrivial. The intention is to continue expanding the server-side
  functionality over time.

* In order to facilitate using this project as a basis &mdash; and specifically
  because no amount of configuration hooks will ever turn out to be fully
  adequate &mdash; the build script can be invoked with an argument to indicate
  an overlay source directory, allowing one to override individual source files
  while still keeping a "pristine" checkout of the `quillex` repo. See the
  script [`build.sh`](scripts/build.sh) for details.


### Build and Run

Quillex uses [Node](https://nodejs.org) on the server side, and it uses
[npm](https://npmjs,com) for module management. Install both of these if you
haven't already done so. As of this writing, the bulk of development and
testing have been done using `node` version 6 and `npm` version 3.

To build and run, say:

```
$ cd quillex
$ npm start
```

and then visit <http://localhost:8080>. This will do a build first. If you
_just_ want to do the build, then you can say:

```
$ npm install
```

### Cleanup

```
$ npm run clean
```

### Directory structure

* `client` &mdash; Client code and static assets. The main client-side
  application entrypoint is `js/app.js`.
* `server` &mdash; Server code. The main entrypoint is `main.js`.
* `out` &mdash; Where the results of doing a build end up.

### Other information

* [Authors](AUTHORS.md) (and acknowledgments)
* [Contributing](CONTRIBUTING.md)
* [License](LICENSE.md)

```
Copyright 2016 the Quillex Authors (Dan Bornstein et alia).
Licensed AS IS and WITHOUT WARRANTY under the Apache License,
Version 2.0. Details: <http://www.apache.org/licenses/LICENSE-2.0>
```
