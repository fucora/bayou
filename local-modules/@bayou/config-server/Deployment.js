// Copyright 2016-2018 the Bayou Authors (Dan Bornstein et alia).
// Licensed AS IS and WITHOUT WARRANTY under the Apache License,
// Version 2.0. Details: <http://www.apache.org/licenses/LICENSE-2.0>

import { use } from '@bayou/injecty';
import { UtilityClass } from '@bayou/util-common';

/**
 * Utility functionality regarding the deployment configuration of a server.
 */
export default class Deployment extends UtilityClass {
  /**
   * Determines the location of the "var" (variable / mutable data) directory,
   * returning an absolute path to it. (This is where, for example, log files
   * are stored.) The directory need not exist; the system will take care of
   * creating it as needed.
   *
   * The `baseDir` argument is provided for use by configurations (such as
   * commonly used during development) which want to keep code and data
   * together. It's expected that in many production environments, though, the
   * `baseDir` argument will be ignored, instead returning an unrelated
   * filesystem path. (For example, many deployment environments want to make
   * their code directories read-only.)
   *
   * @param {string} baseDir The base product directory. This is the root
   *   directory under which the code for the product lives.
   * @returns {string} Absolute filesystem path to the "var" directory to use.
   */
  static findVarDirectory(baseDir) {
    return use.Deployment.findVarDirectory(baseDir);
  }

  /**
   * Checks to see if this server is running in a "development" environment,
   * returning an indication of the fact. A development environment is notable
   * in that it notices when source files change (and acts accordingly), has
   * `/debug` endpoints enabled, and may be less secure in other ways as a
   * tradeoff for higher internal visibility, that is, higher debugability.
   *
   * @returns {boolean} `true` if this server is running in a development
   *   environment, or `false` if not.
   */
  static isRunningInDevelopment() {
    return use.Deployment.isRunningInDevelopment();
  }
}
