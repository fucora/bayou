// Copyright 2016-2017 the Bayou Authors (Dan Bornstein et alia).
// Licensed AS IS and WITHOUT WARRANTY under the Apache License,
// Version 2.0. Details: <http://www.apache.org/licenses/LICENSE-2.0>

import { assert } from 'chai';
import { describe, it } from 'mocha';

import { Registry } from 'api-common';
import { Random } from 'util-common';

class RegistryTestApiObject {
  constructor() {
    this.initialized = true;
  }

  static get API_NAME() {
    return 'RegistryTestApiObject';
  }

  toApi() {
    return ['fake argument', 0, 1, 2];
  }

  static fromApi(arguments_unused) {
    return new RegistryTestApiObject();
  }
}

class FindTestApiObject {
  constructor() {
    this.initialized = true;
  }

  static get API_NAME() {
    return 'FindTestApiObject';
  }

  toApi() {
    return ['fake argument', 0, 1, 2];
  }

  static fromApi(arguments_unused) {
    return new FindTestApiObject();
  }
}

class NoApiName {
  toApi() {
    return 'NoApiName!';
  }

  static fromApi() {
    return new NoApiName();
  }
}

class NoToApi {
  constructor() {
    this.API_NAME = 'NoToApi';
  }

  static fromApi() {
    return new NoToApi();
  }
}

class NoFromApi {
  constructor() {
    this.API_NAME = 'NoFromApi';
  }

  toApi() {
    return new NoFromApi();
  }
}

describe('api-common/Registry', () => {
  describe('.ARRAY_TAG', () => {
    it("should return 'array'", () => {
      assert.strictEqual(Registry.ARRAY_TAG, 'array');
    });
  });

  describe('register(class)', () => {
    it('should require classes with an APP_NAME property, fromName() class method, and toApi() instance method', () => {
      assert.throws(() => Registry.theOne.register(true));
      assert.throws(() => Registry.theOne.register(37));
      assert.throws(() => Registry.theOne.register('this better not work!'));
      assert.throws(() => Registry.theOne.register({ }));
      assert.throws(() => Registry.theOne.register([]));
      assert.throws(() => Registry.theOne.register(null));
      assert.throws(() => Registry.theOne.register(undefined));
      assert.throws(() => Registry.theOne.register(NoApiName));
      assert.throws(() => Registry.theOne.register(NoToApi));
      assert.throws(() => Registry.theOne.register(NoFromApi));

      assert.doesNotThrow(() => Registry.theOne.register(RegistryTestApiObject));
    });
  });

  describe('find(className)', () => {
    it('should throw an error if an unregistered class is requested', () => {
      const randomName = Random.hexByteString(32);
      assert.throws(() => Registry.theOne.classForName(randomName));
    });

    it('should return the named class if it is registered', () => {
      Registry.theOne.register(FindTestApiObject);

      const testClass = Registry.theOne.classForName(FindTestApiObject.API_NAME);
      const testObject = new testClass();

      assert.instanceOf(testObject, FindTestApiObject);
    });
  });
});
