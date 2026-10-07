import test from 'node:test'
import assert from 'node:assert/strict'
import { parseAdminNumbers, sanitizeWaConfig, cleanParam, buildNotification, buildTemplateRequest, interpretSendResponse, shippingSummary, DEFAULT_WA_CONFIG } from '../lib/wa-notify.js'

test('nomor admin: berbagai tulisan, unik, maksimal 5, yang rusak dibuang', () => {
  assert.deepEqual(parseAdminNumbers('0812-3456-7890, +62 813 1111 2222\n0812 3456 7890'), ['6281234567890', '6281311112222'])
  assert.deepEqual(parseAdminNumbers('abc, 12'), [])
  assert.equal(parseAdminNumbers(Array.from({ length: 9 }, (_, i) => `08120000000${i}`)).length, 5)
})

test('pengaturan: bawaan, validasi, nomor salah ditolak', () => {
  const ok = sanitizeWaConfig({ enabled: true, phoneNumberId: ' 123456789012345 ', adminNumbers: '0812-3456-7890' })
  assert.deepEqual(ok.value, { enabled: true, phoneNumberId: '123456789012345', adminNumbers: ['6281234567890'], templatePaid: 'pesanan_dibayar', templateReview: 'pesanan_perlu_dicek', language: 'id' })
  assert.equal(sanitizeWaConfig({ phoneNumberId: '' }).value.enabled, false)
  for (const bad of [null, { phoneNumberId: 'abc' }, { templatePaid: 'Pesanan Dibayar' }, { language: 'indonesia' }, { adminNumbers: '0812-3456-7890, 12' }]) assert.ok(sanitizeWaConfig(bad).error, JSON.stringify(bad))
})

test('isian templat: tanpa baris baru, spasi dirapikan, tidak kosong', () => {
  assert.equal(cleanParam('Ibu\nSari\t  Dewi'), 'Ibu Sari Dewi')
  assert.equal(cleanParam(''), '-')
  assert.equal(cleanParam(null), '-')
  assert.equal(cleanParam('x'.repeat(500)).length, 120)
})

test('notifikasi dibayar: urutan isian = nomor, nama, total, pengiriman', () => {
  const order = { orderId: 'LPI-1', customer: { name: 'Ibu Sari' }, grossAmount: 72000, shipping: { method: 'internal' }, delivery: { mode: 'terjadwal', date: '2026-10-08', slotLabel: 'Pagi' } }
  const n = buildNotification('paid', order, DEFAULT_WA_CONFIG)
  assert.equal(n.template, 'pesanan_dibayar')
  assert.deepEqual(n.params, ['LPI-1', 'Ibu Sari', 'Rp 72.000', 'Kurir toko, 2026-10-08 Pagi'])
  const r = buildNotification('review', order, DEFAULT_WA_CONFIG, 'Jumlah pembayaran tidak cocok')
  assert.equal(r.template, 'pesanan_perlu_dicek')
  assert.deepEqual(r.params, ['LPI-1', 'Jumlah pembayaran tidak cocok'])
})

test('ringkasan pengiriman: instan, sekarang, tanpa data', () => {
  assert.equal(shippingSummary({ shipping: { method: 'biteship', courier: { name: 'GoSend', serviceName: 'Instant' } } }), 'Kurir instan GoSend Instant')
  assert.equal(shippingSummary({ delivery: { mode: 'sekarang', slotLabel: 'Siang' } }), 'Kurir toko, hari ini Siang')
  assert.equal(shippingSummary({}), 'Kurir toko')
})

test('isi permintaan Graph API', () => {
  const b = buildTemplateRequest({ to: '6281234567890', template: 'pesanan_dibayar', language: 'id', params: ['a', 'b'] })
  assert.deepEqual(b, { messaging_product: 'whatsapp', to: '6281234567890', type: 'template', template: { name: 'pesanan_dibayar', language: { code: 'id' }, components: [{ type: 'body', parameters: [{ type: 'text', text: 'a' }, { type: 'text', text: 'b' }] }] } })
})

test('balasan Meta: sukses dan pesan ramah untuk galat umum', () => {
  assert.deepEqual(interpretSendResponse(200, { messages: [{ id: 'wamid.X' }] }), { ok: true, id: 'wamid.X' })
  assert.match(interpretSendResponse(401, { error: { code: 190, message: 'expired' } }).error, /Token/)
  assert.match(interpretSendResponse(400, { error: { code: 132001, message: 'x' } }).error, /Templat/)
  assert.match(interpretSendResponse(400, { error: { code: 131030, message: 'x' } }).error, /penerima/)
  assert.match(interpretSendResponse(400, { error: { code: 131042, message: 'x' } }).error, /pembayaran/)
  assert.match(interpretSendResponse(400, { error: { code: 100, message: 'x' } }).error, /Phone number ID/)
  assert.match(interpretSendResponse(500, {}).error, /500/)
  assert.equal(interpretSendResponse(200, {}).ok, false)
})

import { parseChatIds, sanitizeTelegramConfig, cleanBotToken, telegramText, buildTelegramRequest, interpretTelegramResponse } from '../lib/telegram-notify.js'

test('telegram: chat id (grup negatif), unik, maks 5, rusak ditolak', () => {
  assert.deepEqual(parseChatIds('123456789, -1001234567890\n123456789'), ['123456789', '-1001234567890'])
  assert.deepEqual(parseChatIds('abc 12'), [])
  assert.equal(parseChatIds('111111 222222 333333 444444 555555 666666').length, 5)
  assert.ok(sanitizeTelegramConfig({ chatIds: '123456789, abc' }).error)
  assert.deepEqual(sanitizeTelegramConfig({ enabled: true, chatIds: '123456789' }).value, { enabled: true, chatIds: ['123456789'] })
  assert.equal(sanitizeTelegramConfig(null).error !== undefined, true)
})

test('telegram: bentuk token bot', () => {
  assert.equal(cleanBotToken(' 123456789:AAFh8d-xyzABCDEFGHIJKLMNOPQRSTUV1 '), '123456789:AAFh8d-xyzABCDEFGHIJKLMNOPQRSTUV1')
  for (const bad of ['', 'abc', '123:short', 'xyz:AAFh8d-xyzABCDEFGHIJKLMNOPQRSTUV1', null]) assert.equal(cleanBotToken(bad), null)
})

test('telegram: teks pesan dan permintaan', () => {
  const order = { orderId: 'LPI-1', customer: { name: 'Ibu Sari' }, grossAmount: 72000, delivery: { mode: 'sekarang', slotLabel: 'Siang' } }
  const t = telegramText('paid', order)
  assert.ok(t.includes('LPI-1') && t.includes('Ibu Sari') && t.includes('Rp 72.000') && t.includes('hari ini Siang'))
  assert.ok(telegramText('review', order, 'Jumlah tidak cocok').includes('Jumlah tidak cocok'))
  assert.ok(telegramText('test', order).includes('Tes'))
  assert.deepEqual(buildTelegramRequest('123', 'hai'), { chat_id: '123', text: 'hai', disable_web_page_preview: true })
  assert.equal(buildTelegramRequest('1', 'x'.repeat(9000)).text.length, 3500)
})

test('telegram: balasan ramah', () => {
  assert.deepEqual(interpretTelegramResponse(200, { ok: true }), { ok: true })
  assert.match(interpretTelegramResponse(401, {}).error, /Token bot/)
  assert.match(interpretTelegramResponse(400, { description: 'Bad Request: chat not found' }).error, /Chat ID/)
  assert.match(interpretTelegramResponse(403, { description: 'Forbidden: bot was blocked by the user' }).error, /Start/)
  assert.match(interpretTelegramResponse(500, {}).error, /500/)
})
