import { FirebaseScrypt } from 'firebase-scrypt'
const s = new FirebaseScrypt({ saltSeparator: String(process.env.FIREBASE_SALT_SEPARATOR), signerKey: String(process.env.FIREBASE_SIGNER_KEY), rounds: 8, memCost: 14 })
const salt = 'AbCdEf0123456789'
const h = await s.hash('correct horse battery staple', salt)
const ok = await s.verify('correct horse battery staple', salt, h)
const bad = await s.verify('wrong password', salt, h)
console.log(JSON.stringify({ hash_len: h.length, verify_correct: ok, verify_wrong: bad }, null, 2))
