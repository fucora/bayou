// Copyright 2016-2017 the Bayou Authors (Dan Bornstein et alia).
// Licensed AS IS and WITHOUT WARRANTY under the Apache License,
// Version 2.0. Details: <http://www.apache.org/licenses/LICENSE-2.0>

import { TString } from 'typecheck';
import { CommonBase, DataUtil, Errors, Functor } from 'util-common';

import RevisionNumber from './RevisionNumber';

/**
 * Operation which can be applied to a `Property` or `PropertySnapshot`.
 */
export default class PropertyOp extends CommonBase {
  /** {string} Operation name for "delete property" operations. */
  static get DELETE_PROPERTY() {
    return 'delete_property';
  }

  /** {string} Operation name for "set property" operations. */
  static get SET_PROPERTY() {
    return 'set_property';
  }

  /** {string} Operation name for "set revision number" operations. */
  static get SET_REV_NUM() {
    return 'set_rev_num';
  }

  /**
   * Constructs a new "delete property" operation.
   *
   * @param {string} name Name of the property being deleted. Must be an
   *   "identifier" string.
   * @returns {PropertyOp} An appropriately-constructed operation.
   */
  static op_deleteProperty(name) {
    TString.identifier(name);

    return new PropertyOp(new Functor(PropertyOp.DELETE_PROPERTY, name));
  }

  /**
   * Constructs a new "set property" operation.
   *
   * @param {string} name Name of the property being set. Must be an
   *   "identifier" string.
   * @param {*} value Value of the property. Must be a pure data value.
   * @returns {PropertyOp} An appropriately-constructed operation.
   */
  static op_setProperty(name, value) {
    TString.identifier(name);
    value = DataUtil.deepFreeze(value);

    return new PropertyOp(new Functor(PropertyOp.SET_PROPERTY, name, value));
  }

  /**
   * Constructs a new "set revision number" operation.
   *
   * @param {Int} revNum The new revision number.
   * @returns {PropertyOp} The corresponding operation.
   */
  static op_updateRevNum(revNum) {
    RevisionNumber.check(revNum);

    return new PropertyOp(new Functor(PropertyOp.SET_REV_NUM, revNum));
  }

  /**
   * Constructs an instance. This should not be used directly. Instead, used
   * the static constructor methods defined by this class.
   *
   * @param {Functor} payload The operation payload (name and arguments).
   */
  constructor(payload) {
    super();

    /** {Functor} payload The operation payload (name and arguments). */
    this._payload = Functor.check(payload);

    Object.freeze(this);
  }

  /** {Functor} The operation payload (name and arguments). */
  get payload() {
    return this._payload;
  }

  /**
   * {object} The properties of this operation, as a conveniently-accessed
   * simple object. `opName` is always bound to the operation name. Other
   * bindings depend on the operation name. Guaranteed to be an immutable
   * object.
   */
  get props() {
    const payload = this._payload;
    const opName  = payload.name;

    switch (opName) {
      case PropertyOp.DELETE_PROPERTY: {
        const [name] = payload.args;
        return Object.freeze({ opName, name });
      }

      case PropertyOp.SET_PROPERTY: {
        const [name, value] = payload.args;
        return Object.freeze({ opName, name, value });
      }

      case PropertyOp.SET_REV_NUM: {
        const [revNum] = payload.args;
        return Object.freeze({ opName, revNum });
      }

      default: {
        throw Errors.wtf(`Weird operation name: ${opName}`);
      }
    }
  }

  /**
   * Compares this to another possible-instance, for equality of content.
   *
   * @param {*} other Value to compare to.
   * @returns {boolean} `true` iff `other` is also an instance of this class,
   *   and `this` and `other` have equal contents.
   */
  equals(other) {
    if (this === other) {
      return true;
    } else if (!(other instanceof PropertyOp)) {
      return false;
    }

    const p1 = this._payload;
    const p2 = other._payload;

    return (p1.name === p2.name)
      && DataUtil.equalData(p1.args, p2.args);
  }

  /**
   * Converts this instance for API transmission.
   *
   * @returns {array} Reconstruction arguments.
   */
  toApi() {
    return [this._payload];
  }

  /**
   * Gets a human-oriented string representation of this instance.
   *
   * @returns {string} The human-oriented representation.
   */
  toString() {
    return `${this.constructor.name} { ${this._payload} }`;
  }
}
