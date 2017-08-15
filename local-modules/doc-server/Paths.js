// Copyright 2016-2017 the Bayou Authors (Dan Bornstein et alia).
// Licensed AS IS and WITHOUT WARRANTY under the Apache License,
// Version 2.0. Details: <http://www.apache.org/licenses/LICENSE-2.0>

import { RevisionNumber } from 'doc-common';
import { UtilityClass } from 'util-common';

/**
 * Utility class that just provides the common `StoragePath` strings used
 * by the document storage format.
 */
export default class Paths extends UtilityClass {
  /** {string} `StoragePath` string for the document format version. */
  static get FORMAT_VERSION() {
    return '/format_version';
  }

  /** {string} `StoragePath` string for the document revision number. */
  static get REVISION_NUMBER() {
    return '/revision_number';
  }

  /**
   * Gets the `StoragePath` string corresponding to the indicated revision
   * number, specifically to store the document change that results in that
   * revision.
   *
   * @param {RevisionNumber} revNum The revision number.
   * @returns {string} The corresponding `StoragePath` string.
   */
  static forDocumentChange(revNum) {
    RevisionNumber.check(revNum);
    return `/change/${revNum}`;
  }
}
