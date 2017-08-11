// Copyright 2016-2017 the Bayou Authors (Dan Bornstein et alia).
// Licensed AS IS and WITHOUT WARRANTY under the Apache License,
// Version 2.0. Details: <http://www.apache.org/licenses/LICENSE-2.0>

import { TInt, TString } from 'typecheck';
import { InfoError, UtilityClass } from 'util-common';

import StoragePath from './StoragePath';

/**
 * Utility class for constructing errors salient to this module.
 *
 * **Note:** The names of the methods match the functor names, and because the
 * convention for those is `lowercase_underscore`, that is what's used.
 */
export default class Errors extends UtilityClass {
  /**
   * Constructs an error indicating that a file does not exist.
   *
   * @param {string} id ID of the file.
   * @returns {InfoError} An appropriately-constructed error.
   */
  static file_not_found(id) {
    TString.check(id);
    return new InfoError('file_not_found', id);
  }

  /**
   * Constructs an error indicating that a storage path contains data with a
   * different hash than expected.
   *
   * @param {string} storagePath Path in question.
   * @param {string} hash The expected hash.
   * @returns {InfoError} An appropriately-constructed error.
   */
  static path_hash_mismatch(storagePath, hash) {
    StoragePath.check(storagePath);
    TString.nonempty(hash);
    return new InfoError('path_hash_mismatch', storagePath, hash);
  }

  /**
   * Constructs an error indicating that a storage path was expected to be
   * absent (that is, not store any data) but turned out to have data.
   *
   * @param {string} storagePath Path in question.
   * @returns {InfoError} An appropriately-constructed error.
   */
  static path_not_absent(storagePath) {
    StoragePath.check(storagePath);
    return new InfoError('path_not_absent', storagePath);
  }

  /**
   * Constructs an error indicating that a storage path was expected to have
   * data but turned out not to.
   *
   * @param {string} storagePath Path in question.
   * @returns {InfoError} An appropriately-constructed error.
   */
  static path_not_found(storagePath) {
    StoragePath.check(storagePath);
    return new InfoError('path_not_found', storagePath);
  }

  /**
   * Constructs an error indicating that a requested file revision is not
   * available.
   *
   * @param {Int} revNum Requested revision number.
   * @returns {InfoError} An appropriately-constructed error.
   */
  static revision_not_available(revNum) {
    TInt.nonNegative(revNum);
    return new InfoError('revision_not_available', revNum);
  }

  /**
   * Constructs an error indicating that a transaction timed out.
   *
   * @param {Int} timeoutMsec The original length of the timeout, in msec.
   * @returns {InfoError} An appropriately-constructed error.
   */
  static transaction_timed_out(timeoutMsec) {
    TInt.check(timeoutMsec);
    return new InfoError('transaction_timed_out', timeoutMsec);
  }

  /**
   * Indicates whether or not the given error is a transaction timeout error.
   *
   * @param {Error} error Error in question.
   * @returns {boolean} `true` iff it represents a transaction timeout.
   */
  static isTimeout(error) {
    return (error instanceof InfoError)
      &&   (error.name === 'transaction_timed_out');
  }
}
