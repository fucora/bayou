// Copyright 2016 the Quillex Authors (Dan Bornstein et alia).
// Licensed AS IS and WITHOUT WARRANTY under the Apache License,
// Version 2.0. Details: <http://www.apache.org/licenses/LICENSE-2.0>

/**
 * Construction of promises which become resolved after a specified delay.
 * This class isn't meant to be instantiable; it just exists to hold static
 * methods.
 */
export default class Delay {
  /**
   * Returns a promise that, after a specified delay, resolves to an indicated
   * value. If that value is _also_ a promise, then the result of this function
   * will (of course) only become resolved once that value is also resolved.
   *
   * @param delayMsec Minimum amount of time in msec before the result will be
   *   resolved. This is passed to `setTimeout()`, see which for details about
   *   acceptable values.
   * @param value (default `true`) Value to become resolved to. This can itself
   *    be a promise.
   * @return a promise
   */
  static resolve(delayMsec, value = true) {
    return new Promise((res, rej) => {
      setTimeout(() => { res(value); }, delayMsec);
    });
  }

  /**
   * Returns a promise that, after a specified delay, becomes rejected with an
   * indicated reason.
   *
   * @param delayMsec Minimum amount of time in msec before the result will be
   *   rejected. This is passed to `setTimeout()`, see which for details about
   *   acceptable values.
   * @param reason Reason for rejection.
   * @return a promise
   */
  static reject(delayMsec, reason) {
    return new Promise((res, rej) => {
      setTimeout(() => { rej(reason); }, delayMsec);
    });
  }
}
