// Copyright 2016-2017 the Bayou Authors (Dan Bornstein et alia).
// Licensed AS IS and WITHOUT WARRANTY under the Apache License,
// Version 2.0. Details: <http://www.apache.org/licenses/LICENSE-2.0>

import { TInt, TString } from 'typecheck';
import { ColorSelector, CommonBase } from 'util-common';

import CaretDelta from './CaretDelta';
import CaretOp from './CaretOp';

/**
 * {Caret|null} An instance with all default values. Initialized in the static
 * method of the same name.
 */
let EMPTY = null;

/**
 * Information about the state of a single document editing session. Instances
 * of this class are always frozen (immutable).
 *
 * **Note:** The use of the term "caret" in this and other classes, method
 * names, and the like, is meant to be a synecdochal metaphor for all
 * information about a session, including the human driving it. The caret per
 * se is merely the most blatant aspect of it.
 */
export default class Caret extends CommonBase {
  /** {Caret} An instance with all default values. */
  static get EMPTY() {
    if (EMPTY === null) {
      EMPTY = new Caret('no-session', 0, 0, '#000000');
    }

    return EMPTY;
  }

  /**
   * Constructs an instance. Only the first argument (`sessionId`) is required;
   * though generally short-lived, instances constructed with the rest of the
   * arguments as defaults are used as the carets for newly-minted sessions.
   *
   * @param {string} sessionId An opaque token that can be used with other
   *   APIs to get information about the author whose caret this is (e.g. author
   *   name, avatar, user id, etc). No assumptions should be made about the
   *   format of `sessionId`.
   * @param {Int} [index = 0] The zero-based location of the caret (or beginning
   *   of a selection) within the document.
   * @param {Int} [length = 0] The number of characters within a selection, or
   *   zero if this caret merely represents the insertion point and not a
   *   selection.
   * @param {string} [color = '#000000'] The color to be used when annotating
   *   this caret. The color must be in the CSS three-byte hex form (e.g.
   *   `'#b8ff2e'`).
   */
  constructor(sessionId, index = 0, length = 0, color = '#000000') {
    super();

    /** {string} The session ID. */
    this._sessionId = TString.check(sessionId);

    /** {Map<string,*>} Map of all of the caret fields, from name to value. */
    this._fields = new Map([
      ['index',  TInt.nonNegative(index)],
      ['length', TInt.nonNegative(length)],
      ['color',  ColorSelector.checkHexColor(color)]
    ]);

    Object.freeze(this);
  }

  /**
   * {string} Opaque reference to be used with other APIs to get information
   * about the author whose caret this is.
   */
  get sessionId() {
    return this._sessionId;
  }

  /**
   * {Int} The zero-based leading position of this caret/selection.
   */
  get index() {
    return this._fields.get('index');
  }

  /**
   * {Int} The length of the selection, or zero if it is just an insertion point.
   */
  get length() {
    return this._fields.get('length');
  }

  /**
   * {string} The color to be used when annotating this selection. It is in CSS
   * three-byte hex format (e.g. `'#ffeab9'`).
   */
  get color() {
    return this._fields.get('color');
  }

  /**
   * Composes the given `delta` on top of this instance, producing a new
   * instance. The operations in `delta` must all be `updateCaretField` ops
   * for the same `sessionId` as this instance.
   *
   * @param {CaretDelta} delta Delta to apply.
   * @returns {Caret} Caret consisting of this instance's data as the base, with
   *   `delta`'s updates applied.
   */
  compose(delta) {
    CaretDelta.check(delta);

    const fields = new Map(this._fields);

    for (const op of delta.ops) {
      if (op.name !== CaretOp.UPDATE_CARET_FIELD) {
        throw new Error(`Invalid operation name: ${op.name}`);
      }
      fields.set(op.arg('key'), op.arg('value'));
    }

    return new Caret(this.sessionId,
      fields.get('index'), fields.get('length'), fields.get('color'));
  }

  /**
   * Calculates the difference from a given caret to this one. The return
   * value is a delta which can be composed with this instance to produce the
   * snapshot passed in here as an argument. That is, `newerCaret ==
   * this.compose(this.diff(newerCaret))`.
   *
   * **Note:** The word `newer` in the argument name is meant to be suggestive
   * of typical usage of this method, but there is no actual requirement that
   * the argument be strictly newer in any sense, compared to the instance this
   * method is called on.
   *
   * @param {Caret} newerCaret Caret to take the difference from. It must have
   *   the same `sessionId` as this instance.
   * @returns {CaretDelta} Delta which represents the difference between
   *   `newerCaret` and this instance.
   */
  diff(newerCaret) {
    Caret.check(newerCaret);

    const sessionId = this.sessionId;

    if (sessionId !== newerCaret.sessionId) {
      throw new Error('Cannot `diff` carets with mismatched `sessionId`.');
    }

    const fields = this._fields;
    const ops    = [];

    for (const [k, v] of newerCaret._fields) {
      if (v !== fields.get(k)) {
        ops.push(CaretOp.op_updateCaretField(sessionId, k, v));
      }
    }

    return new CaretDelta(ops);
  }

  /**
   * Compares this to another instance, for equality of content.
   *
   * @param {Caret} other Caret to compare to.
   * @returns {boolean} `true` iff `this` and `other` have equal contents.
   */
  equals(other) {
    Caret.check(other);

    if (this._sessionId !== other._sessionId) {
      return false;
    }

    const fields = this._fields;
    for (const [k, v] of other._fields) {
      if (v !== fields.get(k)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Converts this instance for API transmission.
   *
   * @returns {array} Reconstruction arguments.
   */
  toApi() {
    // Convert the `_fields` map to a simple object for the purpose of coding.
    const fields = {};
    for (const [k, v] of this._fields) {
      fields[k] = v;
    }

    return [this._sessionId, fields];
  }

  /**
   * Makes a new instance of this class from API arguments.
   *
   * @param {string} sessionId The session ID.
   * @param {object} fields The caret fields, as a simple object (not a map).
   * @returns {Caret} The new instance.
   */
  static fromApi(sessionId, fields) {
    return new Caret(sessionId, fields.index, fields.length, fields.color);
  }
}
