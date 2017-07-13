// Copyright 2016-2017 the Bayou Authors (Dan Bornstein et alia).
// Licensed AS IS and WITHOUT WARRANTY under the Apache License,
// Version 2.0. Details: <http://www.apache.org/licenses/LICENSE-2.0>

import { TObject, TString } from 'typecheck';
import { CommonBase } from 'util-common';

/**
 * Base class for promise-chainable events. Each event is chained to the next
 * event which gets emitted by the same source. The chain is available both
 * synchronously and asynchronously. In the synchronous case, it is possible to
 * run into the end of the chain, represented by `null`. In the asynchronous
 * case, the properties and accessors return promises that only become resolved
 * once an appropriate event has been emitted.
 *
 * This base class merely provides a couple of abstract methods to define the
 * basic interface, and a couple of helper methods to walk the chain, and it
 * only requires events have a name. Subclasses are responsible for providing
 * event payloads and arranging for the chain to become constructed.
 */
export default class BaseEvent extends CommonBase {
  /**
   * Constructs an instance.
   *
   * @param {string} eventName Name of the event (its type, really).
   */
  constructor(eventName) {
    super();

    /** {string} Name of the event (its type, really). */
    this._eventName = TString.nonempty(eventName);
  }

  /** {string} Name of the event. */
  get eventName() {
    return this._eventName;
  }

  /**
   * {Promise<BaseEvent>} Promise for the next event in the chain after this
   * instance, which becomes resolved once it is available.
   */
  get next() {
    throw this.mustOverride();
  }

  /**
   * {BaseEvent|null} The next event in the chain after this instance if it
   * is immediately available, or `null` if there is not yet a next event.
   */
  get nextNow() {
    throw this.mustOverride();
  }

  /**
   * Gets the earliest event of the indicated name in the event chain, starting
   * at (and possibly including) this instance. This method only returns once a
   * matching event is available.
   *
   * @param {string} eventName Event name of interest.
   * @returns {QuillEvent} The earliest event with the indidated name, starting
   *   at this instance.
   */
  async earliestOf(eventName) {
    for (let e = this; /*e*/; e = await e.next) {
      if (e.eventName === eventName) {
        return e;
      }
    }
  }

  /**
   * Gets the earliest immediately-available event of the indicated name in the
   * event chain, starting at (and possibly including) this instance. If no
   * matching event is immediately available, this method returns `null`.
   *
   * @param {string} eventName Event name of interest.
   * @returns {QuillEvent|null} The earliest immediately-available event with
   *   the indidated name, starting at this instance; or `null` if there is no
   * such event.
   */
  earliestOfNow(eventName) {
    for (let e = this; e !== null; e = e.nextNow) {
      if (e.eventName === eventName) {
        return e;
      }
    }

    return null;
  }

  /**
   * Gets the next event of the indicated name after this instance, whenever it
   * becomes resolved.
   *
   * @param {string} eventName Event name of interest.
   * @returns {QuillEvent} The next event with the indidated name, once it has
   *   become resolved.
   */
  async nextOf(eventName) {
    return (await this.next).earliestOf(eventName);
  }

  /**
   * Gets the next event of the indicated name after this instance, if it is
   * immediately available.
   *
   * @param {string} eventName Event name of interest.
   * @returns {QuillEvent|null} The next event with the indidated name that has
   *   already been resolved, or `null` if there is no such event.
   */
  nextOfNow(eventName) {
    const nextNow = this.nextNow;
    return (nextNow === null) ? null : nextNow.earliestOfNow(eventName);
  }

  /**
   * Constructs a new event which is set up to be at the head of an event chain
   * which continues with _this_ instance's next event, but with a different
   * event name and payload. Put another way, this constructs a replacement
   * event for this instance, but with the same chaining.
   *
   * @param {string} [eventName = 'none'] Event name.
   * @param {object} [payload = {}] Event payload properties. These become
   *   accessible as-is on the resulting event. If not passed, the resulting
   *   event has no payload properties.
   * @returns {BaseEvent} New event instance with `payload` properties, and
   *   whose `next` and `nextNow` behave the same as this instance's properties
   *   of the same names.
   */
  withNewPayload(eventName = 'none', payload = {}) {
    TObject.check(payload);

    const result = new BaseEvent(eventName);
    Object.defineProperties(result, {
      next:    { get: () => { return this.next;    } },
      nextNow: { get: () => { return this.nextNow; } }
    });

    Object.assign(result, payload);
    Object.freeze(result);
    return result;
  }

  /**
   * Constructs a new event which &mdash; from its perspective &mdash; is
   * "pushed" onto the head of the event chain that continues with this
   * instance. That is, the constructed event's `next` and `nextNow` immediately
   * point at this instance.
   *
   * @param {string} [eventName = 'none'] Event name.
   * @param {object} [payload = {}] Event payload properties. These become
   *   accessible as-is on the resulting event. If not passed, the resulting
   *   event has no payload properties.
   * @returns {BaseEvent} New event instance with `payload` properties, and
   *   whose `next` and `nextNow` refer to this instance.
   */
  withPushedHead(eventName = 'none', payload = {}) {
    TObject.check(payload);

    const result = new BaseEvent(eventName);
    Object.defineProperties(result, {
      next:    { get: () => { return Promise.resolve(this); } },
      nextNow: { get: () => { return this;                  } }
    });

    Object.assign(result, payload);
    Object.freeze(result);
    return result;
  }
}