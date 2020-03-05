import {testMe} from './testing';

test('first test', () => {
    const r = testMe();
    expect(r).toBe(42);
});
