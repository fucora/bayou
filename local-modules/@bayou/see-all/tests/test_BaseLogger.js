// Copyright 2016-2019 the Bayou Authors (Dan Bornstein et alia).
// Licensed AS IS and WITHOUT WARRANTY under the Apache License,
// Version 2.0. Details: <http://www.apache.org/licenses/LICENSE-2.0>

import { assert } from 'chai';
import { describe, it } from 'mocha';

import { LogRecord } from '@bayou/see-all';
import { MockLogger } from '@bayou/see-all/mocks';
import { Functor } from '@bayou/util-common';

// This class is tested via its subclass `MockLogger`, which records all calls
// made to `_impl_logEvent()` and `_impl_logMessage()`.

describe('@bayou/see-all/BaseLogger', () => {
  describe('.event', () => {
    it('provides a whatever valid name you want, calling through to `logEvent()` when used', () => {
      const logger = new MockLogger();
      const name   = 'whatTheMuffin';
      const args   = ['x', 'y', 'z'];
      const expect = new Functor(name, ...args);
      logger.event[name](...args);

      assert.deepEqual(logger.record, [['event', [], expect]]);
    });
  });

  describe('.metric', () => {
    it('provides a whatever valid name you want, calling through to `logMetric()` when used', () => {
      const logger = new MockLogger();
      const name   = 'zorch';
      const args   = [1, 2];
      const expect = new Functor(LogRecord.eventNameFromMetricName(name), ...args);
      logger.metric[name](...args);

      assert.deepEqual(logger.record, [['event', [], expect]]);
    });
  });

  describe('logEvent()', () => {
    it('calls through to `_impl_logEvent()` when given valid arguments', () => {
      const logger  = new MockLogger();
      const payload = new Functor('blort', 1, '2', [3]);

      logger.logEvent(payload.name, ...payload.args);

      assert.deepEqual(logger.record, [['event', [], payload]]);
    });

    it('rejects invalid payload names', () => {
      const logger = new MockLogger();
      assert.throws(() => logger.logEvent('info', 1, 2, 3));
    });
  });

  describe('logMessage()', () => {
    it('calls through to `_impl_logMessage()` when given valid arguments', () => {
      const logger = new MockLogger();
      logger.logMessage('info', 'blort', 7);

      assert.deepEqual(logger.record, [['info', [], 'blort', 7]]);
    });

    it('rejects invalid `level` arguments', () => {
      const logger = new MockLogger();
      assert.throws(() => logger.logMessage('zorch', 'blort', 7));
    });
  });

  describe('level-specific logging methods', () => {
    function test(level) {
      describe(`${level}()`, () => {
        it('calls through to `_impl_logMessage()` with the same arguments', () => {
          const logger = new MockLogger();
          logger[level](1, 2, 3);

          assert.deepEqual(logger.record, [[level, [], 1, 2, 3]]);
        });

        it('accepts a call with no arguments', () => {
          const logger = new MockLogger();
          logger[level]();

          assert.deepEqual(logger.record, [[level, []]]);
        });
      });
    }

    for (const level of LogRecord.MESSAGE_LEVELS) {
      test(level);
    }
  });

  describe('logMetric()', () => {
    it('calls through to `_impl_logEvent()` when given valid arguments', () => {
      const logger  = new MockLogger();
      const name    = 'blort';
      const payload = new Functor(LogRecord.eventNameFromMetricName(name), 1, '2', [3]);

      logger.logMetric(name, ...payload.args);

      assert.deepEqual(logger.record, [['event', [], payload]]);
    });

    it('rejects invalid payload names', () => {
      const logger = new MockLogger();
      assert.throws(() => logger.logMetric('$&*', 1, 2, 3));
    });
  });

  describe('streamFor()', () => {
    it('returns a stream which operates as expected', () => {
      const logger = new MockLogger();
      const stream = logger.streamFor('info');

      stream.write('blort');
      assert.deepEqual(logger.record, [['info', [], 'blort']]);
    });
  });
});
