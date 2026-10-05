// Tautan WhatsApp ke nomor toko. Boleh dipakai di server maupun browser.
export function makeWaLink(settings, text) {
  return `https://wa.me/${settings.whatsappNumber}?text=${encodeURIComponent(text || settings.waMessage)}`
}
