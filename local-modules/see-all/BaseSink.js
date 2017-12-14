// Copyright 2016-2017 the Bayou Authors (Dan Bornstein et alia).
// Licensed AS IS and WITHOUT WARRANTY under the Apache License,
// Version 2.0. Details: <http://www.apache.org/licenses/LICENSE-2.0>

import { CommonBase } from 'util-common';

import LogRecord from './LogRecord';

/**
 * Base class for logging sink. Subclasses must implement `log()` and `time()`.
 *
 * **TODO:** This should follow the usual abstract class pattern and make the
 * methods to implement be named `_impl_*`.
 */
export default class BaseSink extends CommonBase {
  /**
   * "Stringifies" message arguments. Given a list of arguments as originally
   * passed to `log()` (or similar), returns the preferred unified string form.
   * This concatenates all arguments, separating single-line arguments from
   * each other with a single space, and newline-separating multi-line arguments
   * (so that each ends up on its own line).
   *
   * @param {...*} message Original message arguments.
   * @returns {string} Unified string form.
   */
  static stringifyMessage(...message) {
    // For any items in `message` that aren't strings, use `inspect()` to
    // stringify them.
    message = message.map(x => LogRecord.inspectValue(x));

    // Join the arguments together with spaces, et voila!
    return message.join(' ');
  }

  /**
   * Logs a record, as appropriate.
   *
   * @abstract
   * @param {LogRecord} logRecord The record to write.
   */
  log(logRecord) {
    this._mustOverride(logRecord);
  }

  /**
   * Logs the indicated time value as "punctuation" on the log. This class
   * also uses this call to trigger cleanup of old items.
   *
   * @abstract
   * @param {Int} timeMsec Timestamp to log.
   * @param {string} utcString String representation of the time, as UTC.
   * @param {string} localString String representation of the time, in the local
   *   timezone.
   */
  time(timeMsec, utcString, localString) {
    this._mustOverride(timeMsec, utcString, localString);
  }
}
