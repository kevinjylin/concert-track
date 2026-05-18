import test from 'node:test';
import assert from 'node:assert';
import { normalizeState, stateMatches } from './state';

test('normalizeState', async (t) => {
  await t.test('handles null, undefined, and empty string', () => {
    assert.strictEqual(normalizeState(null), null);
    assert.strictEqual(normalizeState(undefined), null);
    assert.strictEqual(normalizeState(''), null);
    assert.strictEqual(normalizeState('   '), null);
  });

  await t.test('normalizes 2-letter state codes', () => {
    assert.strictEqual(normalizeState('ca'), 'CA');
    assert.strictEqual(normalizeState('NY'), 'NY');
    assert.strictEqual(normalizeState('Tx'), 'TX');
  });

  await t.test('maps full state names to codes', () => {
    assert.strictEqual(normalizeState('California'), 'CA');
    assert.strictEqual(normalizeState('new york'), 'NY');
    assert.strictEqual(normalizeState('District of Columbia'), 'DC');
  });

  await t.test('handles dots and extra spaces', () => {
    assert.strictEqual(normalizeState('N.Y.'), 'NY');
    assert.strictEqual(normalizeState('  south   carolina  '), 'SC');
    assert.strictEqual(normalizeState('  North.Dakota  '), 'northdakota');
  });

  await t.test('returns cleaned unknown strings', () => {
    assert.strictEqual(normalizeState('Something'), 'something');
    assert.strictEqual(normalizeState('Some   Where'), 'some where');
  });
});

test('stateMatches', async (t) => {
  await t.test('returns true if expected is null or undefined', () => {
    assert.strictEqual(stateMatches(null, 'CA'), true);
    assert.strictEqual(stateMatches(undefined, 'NY'), true);
    assert.strictEqual(stateMatches('', 'TX'), true);
  });

  await t.test('returns false if expected is set but actual is null or undefined', () => {
    assert.strictEqual(stateMatches('CA', null), false);
    assert.strictEqual(stateMatches('NY', undefined), false);
    assert.strictEqual(stateMatches('TX', ''), false);
  });

  await t.test('returns true for matching states in different formats', () => {
    assert.strictEqual(stateMatches('CA', 'California'), true);
    assert.strictEqual(stateMatches('new york', 'N.Y.'), true);
    assert.strictEqual(stateMatches('TX', 'tx'), true);
  });

  await t.test('returns false for non-matching states', () => {
    assert.strictEqual(stateMatches('CA', 'NY'), false);
    assert.strictEqual(stateMatches('California', 'Texas'), false);
  });
});
