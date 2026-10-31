import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizePlate, isValidPlate, toMercosul, toOld, maskChassi } from '../src/plate.js';
import { estimateIpva, parseBRL } from '../src/ipva.js';

test('normaliza e valida placas', () => {
  assert.equal(normalizePlate(' abc-1234 '), 'ABC1234');
  assert.ok(isValidPlate('ABC1234'));
  assert.ok(isValidPlate('ABC1D23'));
  assert.ok(!isValidPlate('AB1234'));
  assert.ok(!isValidPlate('ABCD123'));
});

test('converte entre padrão antigo e Mercosul', () => {
  assert.equal(toMercosul('ABC1234'), 'ABC1C34');
  assert.equal(toMercosul('ABC1034'), 'ABC1A34');
  assert.equal(toOld('ABC1C34'), 'ABC1234');
  assert.equal(toOld('ABC1Z34'), null);
});

test('mascara chassi', () => {
  assert.equal(maskChassi('9BWZZZ377VT004251'), '***********004251');
  assert.equal(maskChassi(''), null);
});

test('estima IPVA pela UF', () => {
  assert.equal(parseBRL('R$ 48.900,00'), 48900);
  assert.deepEqual(estimateIpva('SP', 50000), { rate: 4, value: 2000 });
  assert.equal(estimateIpva('XX', 50000), null);
});
