// Copyright 2016-2017 the Bayou Authors (Dan Bornstein et alia).
// Licensed AS IS and WITHOUT WARRANTY under the Apache License,
// Version 2.0. Details: <http://www.apache.org/licenses/LICENSE-2.0>

import { BaseSnapshot, RevisionNumber } from 'doc-common';
import { Delay } from 'promise-util';
import { TFunction } from 'typecheck';
import { Errors } from 'util-common';

import BaseComplexMember from './BaseComplexMember';

/** {Int} Initial amount of time (in msec) between update retries. */
const INITIAL_UPDATE_RETRY_MSEC = 50;

/** {Int} Growth factor for update retry delays. */
const UPDATE_RETRY_GROWTH_FACTOR = 5;

/** {Int} Maximum amount of time to spend (in msec) retrying updates. */
const MAX_UPDATE_TIME_MSEC = 20 * 1000; // 20 seconds.

/**
 * Base class for document part controllers. There is one instance of each
 * concrete subclass of this class for each actively-edited document. They are
 * all managed and hooked up via {@link FileComplex}.
 */
export default class BaseControl extends BaseComplexMember {
  /**
   * {class} Class (constructor function) of change objects to be used with
   * instances of this class.
   */
  static get changeClass() {
    // **Note:** `this` in the context of a static method is the class, not an
    // instance.
    return this.snapshotClass.changeClass;
  }

  /**
   * {class} Class (constructor function) of snapshot objects to be used with
   * instances of this class.
   */
  static get snapshotClass() {
    // **Note:** `this` in the context of a static method is the class, not an
    // instance.

    if (!this._snapshotClass) {
      // Call the `_impl` and verify the result.
      const clazz = this._impl_snapshotClass;

      TFunction.checkClass(clazz, BaseSnapshot);
      this._snapshotClass = clazz;
    }

    return this._snapshotClass;
  }

  /**
   * Constructs an instance.
   *
   * @param {FileAccess} fileAccess Low-level file access and related
   *   miscellanea.
   */
  constructor(fileAccess) {
    super(fileAccess);
  }

  /**
   * Gets the instantaneously-current revision number of the portion of the file
   * controlled by this instance. It is an error to call this on an
   * uninitialized document (e.g., when the underlying file is empty).
   *
   * **Note:** Due to the asynchronous nature of the system, the value returned
   * here could be out-of-date by the time it is received by the caller. As
   * such, even when used promptly, it should not be treated as "definitely
   * current" but more like "probably current but possibly just a lower bound."
   *
   * @returns {Int} The instantaneously-current revision number.
   */
  async currentRevNum() {
    // This method merely exists to enforce the return-type contract as
    // specified in the method docs.

    const revNum = await this._impl_currentRevNum();

    return RevisionNumber.check(revNum);
  }

  /**
   * Returns a document change representing a change to the portion of the file
   * controlled by this instance which has been made with respect to a given
   * revision. This returns a promptly-resolved value when `baseRevNum` is not
   * the current revision (that is, it is an older revision); but when
   * `baseRevNum` _is_ the current revision, the return value only resolves
   * after at least one change has been made. It is an error to request a
   * revision that does not yet exist. For subclasses that don't keep full
   * history, it is also an error to request a revision that is _no longer_
   * available as a base; in this case, the error name is always
   * `revision_not_available`.
   *
   * The return value is a change instance with respect to (that is, whose base
   * revision is) the one indicated by `baseRevNum` as passed to the method.
   * That is, roughly speaking, if `snapshot[result.revNum] =
   * snapshot(baseRevNum).compose(result)`.
   *
   * @param {Int} baseRevNum Revision number for the base to get a change with
   *   respect to.
   * @returns {BaseChange} Change with respect to the revision indicated by
   *   `baseRevNum`. Always an instance of the appropriate change class as
   *   specified by the concrete subclass of this class. The result's `revNum`
   *   is guaranteed to be at least one greater than `baseRevNum` (and could
   *   possibly be even larger). The `timestamp` and `authorId` of the result
   *   will both be `null`.
   */
  async getChangeAfter(baseRevNum) {
    const currentRevNum = await this.currentRevNum();
    RevisionNumber.maxInc(baseRevNum, currentRevNum);

    const result = await this._impl_getChangeAfter(baseRevNum, currentRevNum);

    if (result === null) {
      throw Errors.revision_not_available(baseRevNum);
    }

    this.constructor.changeClass.check(result);

    if ((result.timestamp !== null) || (result.authorId !== null)) {
      throw Errors.bad_value(result, this.constructor.changeClass, 'timestamp === null && authorId === null');
    }

    return result;
  }

  /**
   * Gets a snapshot of the full contents of the portion of the file controlled
   * by this instance. It is an error to request a revision that does not yet
   * exist. For subclasses that don't keep full history, it is also an error to
   * request a revision that is _no longer_ available; in this case, the error
   * name is always `revision_not_available`.
   *
   * @param {Int|null} revNum Which revision to get. If passed as `null`,
   *   indicates the current (most recent) revision. **Note:** Due to the
   *   asynchronous nature of the system, when passed as `null` the resulting
   *   revision might already have been superseded by the time it is returned to
   *   the caller.
   * @returns {BaseSnapshot} Snapshot of the indicated revision. Always an
   *   instance of the concrete snapshot type appropriate for this instance.
   */
  async getSnapshot(revNum = null) {
    const currentRevNum = await this.currentRevNum();
    revNum = (revNum === null)
      ? currentRevNum
      : RevisionNumber.maxInc(revNum, currentRevNum);

    const result = await this._impl_getSnapshot(revNum);

    if (result === null) {
      throw Errors.revision_not_available(revNum);
    }

    return this.constructor.snapshotClass.check(result);
  }

  /**
   * Takes a change consisting of full information (except that the author ID
   * is optionally `null`), and applies it, including merging of any
   * intermediate revisions. The return value consists of a "correction" change
   * to be used to get the new latest document state. The correction is with
   * respect to the client's "expected result," that is to say, what the client
   * would get if the operations were applied with no intervening changes. So,
   * for example, if the change is able to be applied as exactly given, the
   * returned correction will have an empty `delta`.
   *
   * As a special case, if the `revNum` is valid and `ops` is empty, this method
   * returns a result of `change.revNum - 1` along with an empty correction.
   * That is, the return value from passing an empty delta doesn't provide any
   * information about subsequent revisions of the document. In this case, the
   * method does _not_ verify whether `change.revNum` is possibly valid.
   *
   * **Note:** This method trusts the `authorId` and `timestamp`, and as such it
   * is _not_ appropriate to expose this method directly to client access.
   *
   * @param {BaseChange} change Change to apply. Must be an instance of the
   *   concrete change class as expected by this instance's class, and must
   *   have a `revNum` of at least `1`.
   * @returns {BaseChange} The correction to the implied expected result of
   *   this operation. Will always be an instance of the appropriate concrete
   *   change class as defined by this instance's class. The `delta` of this
   *   result can be applied to the expected result to derive the revision
   *   indicated by the result's `revNum`. The `timestamp` and `authorId` of the
   *   result will always be `null`.
   */
  async update(change) {
    const changeClass = this.constructor.changeClass;

    // This makes sure we have a surface-level proper instance, but doesn't
    // check for deeper problems (such as an invalid `revNum`). Once in the guts
    // of the operation, we will discover (and properly complain) if things are
    // amiss.
    changeClass.check(change);
    if (change.timestamp === null) {
      throw Errors.bad_value(change, changeClass, 'timestamp !== null');
    }

    const baseRevNum = change.revNum - 1;

    if (baseRevNum < 0) {
      throw Errors.bad_value(change, changeClass, 'revNum >= 1');
    }

    // Check for an empty `delta`. If it is, we don't bother trying to apply it.
    // See method header comment for more info.
    if (change.delta.isEmpty()) {
      return changeClass.FIRST.withRevNum(change.revNum - 1);
    }

    // Snapshot of the base revision. The `getSnapshot()` call effectively
    // validates `change.revNum` as a legit value for the current document
    // state.
    const baseSnapshot = await this.getSnapshot(baseRevNum);

    // Compose the implied expected result. This has the effect of validating
    // the contents of `delta`.
    const expectedSnapshot = baseSnapshot.compose(change);

    // Try performing the update, and then iterate if it failed _and_ the reason
    // is simply that there were any changes that got made while we were in the
    // middle of the attempt. Any other problems are transparently thrown to the
    // caller.
    let retryDelayMsec = INITIAL_UPDATE_RETRY_MSEC;
    let retryTotalMsec = 0;
    let attemptCount = 0;
    for (;;) {
      attemptCount++;
      if (attemptCount !== 1) {
        this.log.info(`Update attempt #${attemptCount}.`);
      }

      const result = await this._impl_update(baseSnapshot, change, expectedSnapshot);

      if (result !== null) {
        return result;
      }

      // A `null` result from the call means that we lost an update race (that
      // is, there was revision skew that occurred during the update attempt),
      // so we delay briefly and iterate.

      if (retryTotalMsec >= MAX_UPDATE_TIME_MSEC) {
        // ...except if these attempts have taken wayyyy too long. If we land
        // here, it's probably due to a bug (but not a total given).
        throw Errors.aborted('Too many failed attempts in `update()`.');
      }

      this.log.info(`Sleeping ${retryDelayMsec} msec.`);
      await Delay.resolve(retryDelayMsec);
      retryTotalMsec += retryDelayMsec;
      retryDelayMsec *= UPDATE_RETRY_GROWTH_FACTOR;
    }
  }

  /**
   * {class} Class (constructor function) of snapshot objects to be used with
   * instances of this class. Subclasses must fill this in.
   *
   * @abstract
   */
  static get _impl_snapshotClass() {
    return this._mustOverride();
  }

  /**
   * Subclass-specific implementation of `currentRevNum()`. Subclasses must
   * override this.
   *
   * @abstract
   * @returns {Int} The instantaneously-current revision number.
   */
  async _impl_currentRevNum() {
    return this._mustOverride();
  }

  /**
   * Subclass-specific implementation of `getChangeAfter()`. Subclasses must
   * override this method.
   *
   * @abstract
   * @param {Int} baseRevNum Revision number for the base to get a change with
   *   respect to. Guaranteed to refer to the instantaneously-current revision
   *   or earlier.
   * @param {Int} currentRevNum The instantaneously-current revision number that
   *   was determined just before this method was called, and which should be
   *   treated as the actually-current revision number at the start of this
   *   method.
   * @returns {BaseChange|null} Change with respect to the revision indicated by
   *   `baseRevNum`, or `null` to indicate that the revision was not available
   *   as a base. If non-`null`, must be an instance of the appropriate change
   *   class as specified by the concrete subclass of this class with `null` for
   *   both `timestamp` and `authorId`.
   */
  async _impl_getChangeAfter(baseRevNum, currentRevNum) {
    return this._mustOverride(baseRevNum, currentRevNum);
  }

  /**
   * Subclass-specific implementation of `getSnapshot()`. Subclasses must
   * override this method.
   *
   * @abstract
   * @param {Int} revNum Which revision to get. Guaranteed to be a revision
   *   number for the instantaneously-current revision or earlier.
   * @returns {BaseSnapshot|null} Snapshot of the indicated revision. Must
   *   either be an instance of the concrete snapshot type appropriate for this
   *   instance or `null`. `null` specifically indicates that `revNum` is a
   *   revision older than what this instance can provide.
   */
  async _impl_getSnapshot(revNum) {
    return this._mustOverride(revNum);
  }

  /**
   * Subclass-specific implementation of `update()`, which should perform one
   * attempt to apply the given change. Additional arguments (beyond what
   * `update()` takes) are pre-calculated snapshots that only ever have to be
   * derived once per outer call to `update()`. This method attempts to apply
   * `change` relative to `baseSnapshot`, taking into account any intervening
   * revisions between `baseSnapshot` and the instantaneously-current revision.
   * If it succeeds (that is, if it manages to get an instantaneously-current
   * snapshot, and use that snapshot to create a final change which is
   * successfully appended to the document, without any other "racing" code
   * doing the same first), then this method returns a proper result for an
   * outer `update()` call. If it fails due to a lost race, then this method
   * returns `null`. All other problems are reported by throwing an error.
   * Subclasses must override this method.
   *
   * @abstract
   * @param {BaseSnapshot} baseSnapshot Snapshot of the base from which the
   *   change is defined. That is, this is the snapshot of `change.revNum - 1`.
   * @param {BaseChange} change The change to apply, same as for `update()`,
   *   except additionally guaranteed to have a non-empty `delta`.
   * @param {BaseSnapshot} expectedSnapshot The implied expected result as
   *   defined by `update()`.
   * @returns {BaseChange|null} Result for the outer call to `update()`,
   *   or `null` if the application failed due losing a race.
   */
  async _impl_update(baseSnapshot, change, expectedSnapshot) {
    return this._mustOverride(baseSnapshot, change, expectedSnapshot);
  }

  // **TODO:** `create()`.
}