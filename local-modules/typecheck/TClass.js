// Copyright 2016-2017 the Bayou Authors (Dan Bornstein et alia).
// Licensed AS IS and WITHOUT WARRANTY under the Apache License,
// Version 2.0. Details: <http://www.apache.org/licenses/LICENSE-2.0>

import { UtilityClass } from 'util-common-base';

import TypeError from './TypeError';

/**
 * Type checker for type `Class`. A "class" is simply a function that can be
 * used as an object constructor.
 */
export default class TClass extends UtilityClass {
  /**
   * Checks a value of type `Class`.
   *
   * @param {*} value The (alleged) class.
   * @returns {Class} `value`.
   */
  static check(value) {
    if (   ((typeof value) !== 'function')
        || ((typeof value.prototype) !== 'object')) {
      return TypeError.badValue(value, 'Class');
    }

    return value;
  }
}