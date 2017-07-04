// Copyright 2016-2017 the Bayou Authors (Dan Bornstein et alia).
// Licensed AS IS and WITHOUT WARRANTY under the Apache License,
// Version 2.0. Details: <http://www.apache.org/licenses/LICENSE-2.0>

import { Hooks } from 'hooks-client';
import { Singleton } from 'util-common';

import QuillProm from './QuillProm';

/** Default toolbar configuration. */
const DEFAULT_TOOLBAR_CONFIG = [
  ['bold', 'italic', 'underline', 'strike', 'code'], // toggled buttons
  ['blockquote', 'code-block'],

  [{ list: 'ordered' }, { list: 'bullet' }],

  [{ header: [1, 2, 3, 4, false] }],

  [{ align: [] }],

  ['clean']                                      // remove formatting button
];

/**
 * Toolbar configuration. Set during the first instantiation of a `Quill`
 * object.
 */
let toolbarConfig = null;

/**
 * Bottleneck for constructing Quill instances. This class exists merely to make
 * it easy to configure this behavior via an overlay.
 */
export default class QuillMaker extends Singleton {
  /**
   * Makes an instance of `Quill`. More specifically, because we want to use
   * a promise chain to get at the edit events, this makes an instance of our
   * custom subclass `QuillProm`.
   *
   * @param {Element} node DOM element to attach to.
   * @returns {QuillProm} instance of `Quill`.
   */
  make(node) {
    if (toolbarConfig === null) {
      toolbarConfig = Object.freeze(
        Hooks.theOne.quillToolbarConfig(DEFAULT_TOOLBAR_CONFIG));
    }

    const result = new QuillProm(node, {
      readOnly: true,
      strict: true,
      theme: 'bubble',
      modules: {
        toolbar: toolbarConfig
      }
    });

    // Let the overlay do extra initialization.
    Hooks.theOne.quillInstanceInit(result);

    return result;
  }
}
