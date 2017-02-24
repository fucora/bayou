// Copyright 2016-2017 the Bayou Authors (Dan Bornstein et alia).
// Licensed AS IS and WITHOUT WARRANTY under the Apache License,
// Version 2.0. Details: <http://www.apache.org/licenses/LICENSE-2.0>

/**
 * "Data value" helper utilities. A "data value" is defined as any JavaScript
 * value or object which has no behavior. This includes anything that can be
 * encoded as JSON without loss of fidelity and also includes things such as
 * `undefined`, symbols, and "odd-shaped" arrays (ones with holes or extra
 * properties). It notably does _not_ include functions, objects with synthetic
 * properties, or objects with a prototype other than `Object.prototype` or
 * `Array.prototype`.
 */
export default class DataUtil {
  /**
   * Makes a deep-frozen clone of the given data value, or return the value
   * itself if it is already deep-frozen.
   *
   * @param {*} value Thing to deep freeze.
   * @returns {*} The deep-frozen version of `value`.
   */
  static deepFreeze(value) {
    switch (typeof value) {
      case 'boolean':
      case 'number':
      case 'string':
      case 'symbol':
      case 'undefined': {
        // Pass through as-is.
        return value;
      }

      case 'object': {
        if (value === null) {
          // Pass through as-is.
          return value;
        }

        const proto = Object.getPrototypeOf(value);
        let cloneBase = null; // Empty object to start from when cloning.

        if (proto === Object.prototype) {
          cloneBase = {};
        } else if (proto === Array.prototype) {
          cloneBase = [];
        } else {
          throw new Error(`Cannot deep-freeze non-data object: ${value}`);
        }

        let newObj = value;
        let any = false; // Becomes `true` the first time a change is made.

        for (const k in value) {
          const oldValue = value[k];
          const newValue = DataUtil.deepFreeze(oldValue);
          if (oldValue !== newValue) {
            if (!any) {
              newObj = Object.assign(cloneBase, value); // Clone the object.
              any = true;
            }
            newObj[k] = newValue;
          }
        }

        Object.freeze(newObj);
        return newObj;
      }

      default: {
        throw new Error(`Cannot deep-freeze non-data value: ${value}`);
      }
    }
  }
}
