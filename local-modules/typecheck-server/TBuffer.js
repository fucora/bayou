// Copyright 2016-2017 the Bayou Authors (Dan Bornstein et alia).
// Licensed AS IS and WITHOUT WARRANTY under the Apache License,
// Version 2.0. Details: <http://www.apache.org/licenses/LICENSE-2.0>

import { TypeError } from 'typecheck';

/**
 * Type checker for type `Buffer`.
 */
export default class TBuffer {
  /**
   * Checks a value of type `Buffer`.
   *
   * @param {*} value The (alleged) `Buffer`.
   * @returns {Buffer} `value`.
   */
  static check(value) {
    if (!Buffer.isBuffer(value)) {
      return TypeError.badValue(value, 'Buffer');
    }

    return value;
  }
}