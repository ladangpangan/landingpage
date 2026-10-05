import test from 'node:test'
import assert from 'node:assert/strict'
import { matchesQuery, normalizeText } from '../lib/search.js'

test('pencarian tidak peduli huruf besar/kecil dan tanda baca', () => {
  assert.equal(normalizeText('  Dada,  AYAM!! '), 'dada ayam')
  assert.ok(matchesQuery(['Dada Ayam Fillet', 'Potongan'], 'DADA'))
  assert.ok(matchesQuery(['Dada Ayam Fillet'], 'fillet dada'))
  assert.ok(matchesQuery(['Karkas Ayam Frozen', 'Ayam Segar'], 'ayam segar'))
})

test('semua kata harus cocok; kata kosong cocok semuanya', () => {
  assert.equal(matchesQuery(['Ceker Ayam'], 'ceker sapi'), false)
  assert.ok(matchesQuery(['Ceker Ayam'], ''))
  assert.ok(matchesQuery(['Ceker Ayam'], '   '))
})
