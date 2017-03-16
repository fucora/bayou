// Copyright 2016-2017 the Bayou Authors (Dan Bornstein et alia).
// Licensed AS IS and WITHOUT WARRANTY under the Apache License,
// Version 2.0. Details: <http://www.apache.org/licenses/LICENSE-2.0>

import { BearerToken } from 'api-server';
import { PromDelay } from 'util-common';

/**
 * {BearerTokens|null} The unique instance of this class. Initialized in the
 * `THE_INSTANCE` getter below.
 */
let THE_INSTANCE = null;

/**
 * Base class for and default implementation of `Hooks.bearerTokens`, which
 * notably serves as documentation for the required methods. See
 * `api-server.BearerToken` for more details.
 */
export default class BearerTokens {
  /** {BearerTokens} The unique instance of this class. */
  static get THE_INSTANCE() {
    if (THE_INSTANCE === null) {
      THE_INSTANCE = new BearerTokens();
    }

    return THE_INSTANCE;
  }

  /**
   * Returns `true` iff `token` (a `BearerToken` per se) grants root access to
   * the system. The (obviously insecure) default is to treat a bearer token of
   * 32 zeroes as granting access.
   *
   * @param {BearerToken} token Token to check.
   * @returns {boolean} `true` iff `token` grants root access.
   */
  grantsRoot(token) {
    // TODO: We should probably provide a less trivial default.
    return token.secretToken === '0'.repeat(32);
  }

  /**
   * Returns `true` iff the `tokenString` is _syntactically_ valid as a bearer
   * token (whether or not it actually grants any access). This will only ever
   * get called on strings (per se) of at least 32 characters, so it is safe to
   * assume those facts.
   *
   * The default implementation just returns `true`.
   *
   * @param {string} tokenString_unused The alleged token.
   * @returns {boolean} `true` iff `tokenString` is syntactically valid.
   */
  isToken(tokenString_unused) {
    return true;
  }

  /**
   * {array<BearerToken>} Array of bearer tokens which grant root access to the
   * system.
   *
   * The (obviously insecure) default is that a token consisting of 32 zeroes
   * grants access.
   */
  get rootTokens() {
    return Object.freeze([new BearerToken('0'.repeat(32))]);
  }

  /**
   * Returns the portion of `tokenString` which should be considered its "ID"
   * for the purposes of lookup, logging, etc.
   *
   * The default implementation just returns the first 16 characters of the
   * string.
   *
   * @param {string} tokenString The token.
   * @returns {string} The ID portion.
   */
  tokenId(tokenString) {
    return tokenString.slice(0, 16);
  }

  /**
   * Returns a promise which becomes resolved (to `true`) the next time that
   * the list of `rootTokens` changes, or (on the margin) could conceivably have
   * changed.
   *
   * The default implementation is for the promise to become resolved every
   * ten minutes even though by default the root tokens never get updated, just
   * so that the update logic gets excercised in the default configuration.
   *
   * @returns {Promise<true>} Promise that resolves when the root tokens should
   *   be checked for update.
   */
  whenRootTokensChange() {
    const CHANGE_FREQUENCY_MSEC = 10 * 60 * 60 * 1000;
    return PromDelay.resolve(CHANGE_FREQUENCY_MSEC);
  }
}
