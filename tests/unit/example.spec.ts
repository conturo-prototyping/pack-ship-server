import { expect } from 'chai';
import { describe, it } from 'mocha';

require('../config'); // recommended way of loading root hooks

describe('It should work...', () => {
  it('basic test', () => {
    expect(1 + 2).to.be.equal(3);
  });
});
