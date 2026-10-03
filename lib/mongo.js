// Koneksi MongoDB bersama. serverSelectionTimeoutMS pendek supaya halaman
// publik tidak menggantung bila database tidak bisa dihubungi.
import { MongoClient } from 'mongodb'

const MONGO_URL = process.env.MONGO_URL || ''
const DB_NAME = process.env.MONGO_DB_NAME || 'ladang_landing'

let _client
export function getDb() {
  if (!MONGO_URL) return null
  if (!_client) {
    _client = new MongoClient(MONGO_URL, {
      maxPoolSize: 5,
      serverSelectionTimeoutMS: 4000,
      connectTimeoutMS: 4000,
    })
  }
  return _client.db(DB_NAME)
}
