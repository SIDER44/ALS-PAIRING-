const { makeid } = require('./gen-id');
const express    = require('express');
const QRCode     = require('qrcode');
const fs         = require('fs');
let router       = express.Router();
const pino       = require('pino');
const {
  default: makeWASocket,
  useMultiFileAuthState,
  delay,
  makeCacheableSignalKeyStore,
  Browsers
} = require('@whiskeysockets/baileys');

function removeFile(FilePath) {
  if (!fs.existsSync(FilePath)) return false;
  fs.rmSync(FilePath, { recursive: true, force: true });
}

router.get('/', async (req, res) => {
  const id = makeid();

  async function ALMEER_QR_CODE() {
    const { state, saveCreds } = await useMultiFileAuthState('./temp/' + id);
    try {
      let sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        logger: pino({ level: 'silent' }),
        browser: Browsers.macOS('Desktop'),
      });

      sock.ev.on('creds.update', saveCreds);

      sock.ev.on('connection.update', async (s) => {
        const { connection, lastDisconnect, qr } = s;

        // Send QR as image
        if (qr) {
          if (!res.headersSent) {
            const qrBuffer = await QRCode.toBuffer(qr, {
              errorCorrectionLevel: 'L',
              width: 300,
              margin: 2,
              color: { dark: '#000000', light: '#ffffff' }
            });
            res.end(qrBuffer);
          }
        }

        if (connection === 'open') {
          await delay(5000);
          const rf = __dirname + `/temp/${id}/creds.json`;

          try {
            const sessionData = fs.readFileSync(rf, 'utf-8');
            const sessionB64  = Buffer.from(sessionData).toString('base64');
            const sessionMsg  = 'ALMEER-XMD~' + sessionB64;

            let sentMsg = await sock.sendMessage(sock.user.id, { text: sessionMsg });

            const desc =
`*🤖 ALMEER XMD — Session Created!* ✅

👋 Thanks for using *ALMEER XMD*!

🔐 *Session ID:* Sent above
⚠️ *Keep it secret! Do NOT share with anyone.*

━━━━━━━━━━━━━━━━━━━━━
🌐 *Deploy your bot:*
https://railway.app

💻 *Source Code:*
https://github.com/SIDER44/ALMEER-XMD3

━━━━━━━━━━━━━━━━━━━━━
> *© Powered by ALMEER XMD*`;

            await sock.sendMessage(sock.user.id, {
              text: desc,
              contextInfo: {
                externalAdReply: {
                  title: 'ALMEER XMD',
                  body: 'WhatsApp Bot',
                  thumbnailUrl: 'https://i.imgur.com/GVW7aoD.jpeg',
                  sourceUrl: 'https://github.com/YOUR_USERNAME/ALMEER-XMD3',
                  mediaType: 1,
                  renderLargerThumbnail: true
                }
              }
            }, { quoted: sentMsg });

          } catch (e) {
            console.log('Session send error:', e.message);
            await sock.sendMessage(sock.user.id, {
              text: '✅ ALMEER XMD Session created successfully!'
            });
          }

          await delay(100);
          await sock.ws.close();
          await removeFile('./temp/' + id);
          console.log(`✅ QR Paired: ${sock.user.id}`);
          await delay(100);
          process.exit();

        } else if (
          connection === 'close' &&
          lastDisconnect?.error?.output?.statusCode !== 401
        ) {
          await delay(100);
          ALMEER_QR_CODE();
        }
      });

    } catch (err) {
      console.log('QR error:', err.message);
      await removeFile('./temp/' + id);
      if (!res.headersSent) await res.send({ code: '❗ Service Unavailable' });
    }
  }

  await ALMEER_QR_CODE();
});

// Auto restart every 3 mins to refresh QR
setInterval(() => {
  console.log('🔄 Refreshing QR service...');
  process.exit();
}, 180000);

module.exports = router;