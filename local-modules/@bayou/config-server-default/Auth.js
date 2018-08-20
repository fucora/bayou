// Copyright 2016-2018 the Bayou Authors (Dan Bornstein et alia).
// Licensed AS IS and WITHOUT WARRANTY under the Apache License,
// Version 2.0. Details: <http://www.apache.org/licenses/LICENSE-2.0>

import { BearerToken } from '@bayou/api-common';
import { BaseAuth } from '@bayou/config-server';
import { Errors } from '@bayou/util-common';

/**
 * {RegEx} Expression that matches properly-formed tokens. The ID and secret
 * portions are each a separate matching group.
 */
const TOKEN_REGEX = /^(tok-[0-9a-f]{16})([0-9a-f]{16})$/;

/**
 * {string} The one well-known root token. This obviously-insecure arrangement
 * is just for this module, the default server configuration module, which is
 * only supposed to be used in development, not real production.
 */
const THE_ROOT_TOKEN = 'tok-00000000000000000000000000000000';

/**
 * Utility functionality regarding the network configuration of a server.
 */
export default class Auth extends BaseAuth {
  /**
   * {array<BearerToken>} Implementation of standard configuration point.
   *
   * This implementation &mdash; obviously insecurely &mdash; just returns
   * an array with a single token consisting of all zeroes in the numeric
   * portion.
   */
  static get rootTokens() {
    return Object.freeze([Auth.tokenFromString(THE_ROOT_TOKEN)]);
  }

  /**
   * Implementation of standard configuration point.
   *
   * This implementation requires strings of lowercase hex, of exactly 32
   * characters.
   *
   * @param {string} tokenString The alleged token.
   * @returns {boolean} `true` iff `tokenString` is valid token syntax.
   */
  static isToken(tokenString) {
    return TOKEN_REGEX.test(tokenString);
  }

  /**
   * Implementation of standard configuration point.
   *
   * This implementation &mdash; obviously insecurely &mdash; hard-codes a
   * particular token to have "root" authority, specifically a token consisting
   * of all zeroes in the numeric portion.
   *
   * @param {BearerToken} token The token in question.
   * @returns {object} Representation of the authority granted by `token`.
   */
  static async tokenAuthority(token) {
    BearerToken.check(token);

    if (token.secretToken === THE_ROOT_TOKEN) {
      return { type: Auth.TYPE_root };
    }

    return { type: Auth.TYPE_none };
  }

  /**
   * Implementation of standard configuration point.
   *
   * @param {string} tokenString The token. It is only valid to pass a value for
   *   which {@link #isToken} returns `true`.
   * @returns {BearerToken} An appropriately-constructed instance.
   */
  static tokenFromString(tokenString) {
    return new BearerToken(Auth.tokenId(tokenString), tokenString);
  }

  /**
   * Implementation of standard configuration point.
   *
   * This implementation just returns the first 16 characters of the given
   * string.
   *
   * @param {string} tokenString The token.
   * @returns {string} The ID portion.
   */
  static tokenId(tokenString) {
    const match = tokenString.match(TOKEN_REGEX);

    if (match) {
      // It is a proper token.
      return match[1];
    }

    // **Note:** We redact the value to reduce the likelihood of leaking
    // security-sensitive info.
    throw Errors.badValue(BearerToken.redactString(tokenString), 'bearer token');
  }
}
