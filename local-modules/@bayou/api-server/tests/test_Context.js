// Copyright 2016-2018 the Bayou Authors (Dan Bornstein et alia).
// Licensed AS IS and WITHOUT WARRANTY under the Apache License,
// Version 2.0. Details: <http://www.apache.org/licenses/LICENSE-2.0>

import { assert } from 'chai';
import { describe, it } from 'mocha';

import { BearerToken, Remote } from '@bayou/api-common';
import { Context, ProxiedObject, TokenAuthorizer } from '@bayou/api-server';
import { Codec } from '@bayou/codec';

/**
 * Mock `TokenAuthorizer` for testing.
 */
class MockAuth extends TokenAuthorizer {
  get _impl_nonTokenPrefix() {
    return 'nontoken-';
  }

  _impl_isToken(tokenString_unused) {
    return true;
  }

  async _impl_targetFromToken(token_unused) {
    return { some: 'authority' };
  }

  _impl_tokenFromString(tokenString) {
    return new BearerToken(tokenString, tokenString);
  }
}

describe('@bayou/api-server/Context', () => {
  describe('constructor()', () => {
    it('should accept two valid arguments', () => {
      assert.doesNotThrow(() => new Context(new Codec(), 'some-tag'));
    });

    it('should accept three valid arguments', () => {
      assert.doesNotThrow(() => new Context(new Codec(), 'some-other-tag', new MockAuth()));
    });
  });

  describe('getRemoteFor', () => {
    it('should return a `Remote` given a `ProxiedObject`', () => {
      const ctx    = new Context(new Codec(), 'tag');
      const obj    = { some: 'object' };
      const po     = new ProxiedObject(obj);
      const result = ctx.getRemoteFor(po);

      assert.instanceOf(result, Remote);
    });

    it('should return a `Remote` whose `id` maps back to the underlying object', async () => {
      const ctx    = new Context(new Codec(), 'tag');
      const obj    = { some: 'object' };
      const po     = new ProxiedObject(obj);
      const result = ctx.getRemoteFor(po);

      assert.isTrue(ctx.hasId(result.targetId));

      const target = await ctx.getAuthorizedTarget(result.targetId);

      assert.strictEqual(target.directObject, obj);
    });

    it('should return the same `Remote` when given the same `ProxiedObject`', () => {
      const ctx     = new Context(new Codec(), 'tag');
      const obj     = { some: 'object' };
      const po      = new ProxiedObject(obj);
      const result1 = ctx.getRemoteFor(po);
      const result2 = ctx.getRemoteFor(po);

      assert.strictEqual(result1, result2);
    });

    it('should return the same `Remote` when given two `ProxiedObject`s for the same underlying object', () => {
      const ctx     = new Context(new Codec(), 'tag');
      const obj     = { some: 'object' };
      const result1 = ctx.getRemoteFor(new ProxiedObject(obj));
      const result2 = ctx.getRemoteFor(new ProxiedObject(obj));

      assert.strictEqual(result1, result2);
    });
  });
});