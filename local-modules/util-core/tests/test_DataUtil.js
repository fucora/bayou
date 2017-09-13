// Copyright 2016-2017 the Bayou Authors (Dan Bornstein et alia).
// Licensed AS IS and WITHOUT WARRANTY under the Apache License,
// Version 2.0. Details: <http://www.apache.org/licenses/LICENSE-2.0>

import { assert } from 'chai';
import { describe, it } from 'mocha';

import { DataUtil, Functor } from 'util-core';

describe('util-core/DataUtil', () => {
  describe('deepFreeze()', () => {
    it('should return the given value if it is a primitive', () => {
      function test(value) {
        const popsicle = DataUtil.deepFreeze(value);
        assert.strictEqual(popsicle, value);
      }

      test(undefined);
      test(null);
      test(false);
      test(true);
      test(37);
      test('a string');
      test(Symbol('foo'));
    });

    it('should return the provided value if it is already deep-frozen', () => {
      function test(value) {
        const popsicle = DataUtil.deepFreeze(value);
        const deepPopsicle = DataUtil.deepFreeze(popsicle);
        assert.isTrue(DataUtil.isDeepFrozen(popsicle));
        assert.strictEqual(deepPopsicle, popsicle, 'Frozen strict-equals re-frozen.');
        assert.deepEqual(deepPopsicle, value, 'Re-frozen deep-equals original.');
      }

      test({});
      test({ a: 1 });
      test({ a: { b: 10 }, c: { d: 20 } });
      test([]);
      test([1]);
      test([[1, 2], [3, 4]]);
    });

    it('should return a deep-frozen object if passed one that isn\'t already deep-frozen', () => {
      function test(value) {
        const popsicle = DataUtil.deepFreeze(value);
        assert.isTrue(DataUtil.isDeepFrozen(popsicle));
        assert.deepEqual(popsicle, value);
      }

      test({});
      test({ a: 1, b: 2 });
      test([]);
      test([1, 2, 'foo', 'bar']);
      test([[[[[[[[[['hello']]]]]]]]]]);
      test({ x: [[[[[123]]]]], y: [37, [37], [[37]], [[[37]]]], z: [{ x: 10 }] });
    });

    it('should not freeze the originally passed value', () => {
      const orig = [1, 2, 3];
      const popsicle = DataUtil.deepFreeze(orig);

      assert.isTrue(DataUtil.isDeepFrozen(popsicle));
      assert.isNotFrozen(orig);
    });

    it('should work on arrays with holes', () => {
      const orig = [1, 2, 3];
      orig[37]   = ['florp'];
      orig[914]  = [[['like']]];

      const popsicle = DataUtil.deepFreeze(orig);

      assert.isTrue(DataUtil.isDeepFrozen(popsicle));
      assert.deepEqual(popsicle, orig);
    });

    it('should work on arrays with additional string-named properties', () => {
      const orig = [1, 2, 3];
      orig.florp = ['florp'];
      orig.like  = [[['like']]];

      const popsicle = DataUtil.deepFreeze(orig);

      assert.isTrue(DataUtil.isDeepFrozen(popsicle));
      assert.deepEqual(popsicle, orig);
    });

    it('should work on arrays with additional symbol-named properties', () => {
      const orig = [1, 2, 3];
      orig[Symbol('florp')] = ['florp'];
      orig[Symbol('like')] = [[['like']]];

      const popsicle = DataUtil.deepFreeze(orig);

      assert.isTrue(DataUtil.isDeepFrozen(popsicle));
      assert.deepEqual(popsicle, orig);
    });

    it('should work on objects with symbol-named properties', () => {
      const orig = { a: 10, [Symbol('b')]: 20 };

      const popsicle = DataUtil.deepFreeze(orig);

      assert.isTrue(DataUtil.isDeepFrozen(popsicle));
      assert.deepEqual(popsicle, orig);
    });

    it('should work on functors with freezable arguments', () => {
      function test(...args) {
        const ftor = new Functor(...args);
        const popsicle = DataUtil.deepFreeze(ftor);
        assert.deepEqual(ftor, popsicle);
        assert.notStrictEqual(ftor, popsicle);
      }

      // All these cases have at least one non-frozen argument, because
      // otherwise the functor would already be deep-frozen. That situation is
      // checked in the next test.
      test('blort', []);
      test('blort', 'foo', ['bar']);
      test('blort', new Functor('x', [1, 2, 3]), [4, 5, 6]);
    });

    it('should work on already-deep-frozen functors', () => {
      function test(...args) {
        const ftor = new Functor(...args);
        const popsicle = DataUtil.deepFreeze(ftor);
        assert.strictEqual(ftor, popsicle);
      }

      test('blort');
      test('blort', 1);
      test('blort', 'foo', Object.freeze(['bar']));
      test('blort', new Functor('x', 1, 2, 3), 'four');
    });

    it('should fail if given a function or a composite that contains same', () => {
      function test(value) {
        assert.throws(() => { DataUtil.deepFreeze(value); });
      }

      test(test); // Because `test` is indeed a function!
      test(() => 123);
      test([1, 2, 3, test]);
      test([1, 2, 3, [[[[[test]]]]]]);
      test({ a: 10, b: test });
      test({ a: 10, b: { c: { d: test } } });
    });

    it('should fail if given a non-simple object or a composite that contains same', () => {
      function test(value) {
        assert.throws(() => { DataUtil.deepFreeze(value); });
      }

      const instance = new Number(10);
      const synthetic = {
        a: 10,
        get x() { return 20; }
      };

      test(instance);
      test(synthetic);
      test([instance]);
      test([1, 2, 3, [[[[[synthetic]]]]]]);
      test({ a: 10, b: instance });
      test({ a: 10, b: { c: { d: synthetic } } });
    });
  });

  describe('isDeepFrozen()', () => {
    it('should return `true` for primitive values', () => {
      function test(value) {
        assert.isTrue(DataUtil.isDeepFrozen(value));
      }

      test(undefined);
      test(null);
      test(false);
      test(true);
      test(37);
      test('a string');
      test(Symbol('foo'));
    });

    it('should return `true` for appropriate frozen composites', () => {
      function test(value) {
        assert.isTrue(DataUtil.isDeepFrozen(value));
      }

      test(Object.freeze([]));
      test(Object.freeze([1, 2, 3]));
      test(Object.freeze([Object.freeze([1, 2, 3])]));

      test(Object.freeze({}));
      test(Object.freeze({ a: 10, b: 20 }));
      test(Object.freeze({ a: 10, b: Object.freeze({ c: 30 }) }));

      test(new Functor('x'));
      test(new Functor('x', 1));
      test(new Functor('x', Object.freeze([1, 2, 3])));
      test(new Functor('x', new Functor('y', 914, 37)));
    });
  });

  it('should return `false` for composites that are not frozen even if all elements are', () => {
    function test(value) {
      assert.isFalse(DataUtil.isDeepFrozen(value));
    }

    test([]);
    test([1, 2, 3]);
    test([Object.freeze([1, 2, 3])]);

    test({});
    test({ a: 10, b: 20 });
    test({ a: 10, b: Object.freeze({ c: 30 }) });
  });

  it('should return `false` for frozen composites with non-frozen elements', () => {
    function test(value) {
      assert.isFalse(DataUtil.isDeepFrozen(value));
    }

    test(Object.freeze([[]]));
    test(Object.freeze([Object.freeze([[]])]));

    test(Object.freeze({ a: {} }));
    test(Object.freeze({ a: Object.freeze({ b: {} }) }));

    test(new Functor('x', []));
    test(new Functor('x', 1, 2, 3, []));
    test(new Functor('x', new Functor('y', [])));
  });

  it('should return `false` for non-simple objects or composites with same', () => {
    function test(value) {
      assert.isFalse(DataUtil.isDeepFrozen(value));
    }

    const instance = Object.freeze(new Number(10));
    const synthetic = Object.freeze({
      a: 10,
      get x() { return 20; }
    });

    test(instance);
    test(synthetic);
    test(Object.freeze([instance]));
    test(Object.freeze([synthetic]));
    test(Object.freeze({ a: instance }));
    test(Object.freeze({ a: synthetic }));
    test(Object.freeze({ a: Object.freeze({ b: instance }) }));
    test(Object.freeze({ a: Object.freeze([1, 2, 3, synthetic]) }));
    test(new Functor('x', instance));
    test(new Functor('x', Object.freeze([synthetic])));
  });

  it('should return `false` for functions, generators and composites containing same', () => {
    function test(value) {
      assert.isFalse(DataUtil.isDeepFrozen(value));
    }

    function func() { return 10; }
    function* gen() { yield 10; }
    Object.freeze(func);
    Object.freeze(gen);

    test(func);
    test(gen);
    test(Object.freeze([func]));
    test(Object.freeze([gen]));
    test(Object.freeze({ a: func }));
    test(Object.freeze({ a: Object.freeze([1, 2, gen]) }));
  });
});
