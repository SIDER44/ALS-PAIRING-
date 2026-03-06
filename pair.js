const { makeid } = require('./gen-id');
const express    = require('express');
const fs         = require('fs');
let router       = express.Router();
const pino       = require('pino');
const {
  default: makeWASocket,
  useMultiFileAuthState,
  delay,
  Browsers,
  makeCacheableSignalKeyStore,
  DisconnectReason
} = require('@whiskeysockets/baileys');

function removeFile(FilePath) {
  if (!fs.existsSync(FilePath)) return false;
  fs.rmSync(FilePath, { recursive: true, force: true });
}

router.get('/', async (req, res) => {
  const id  = makeid();
  let num   = req.query.number;

  async function ALMEER_PAIR_CODE() {
    const { state, saveCreds } = await useMultiFileAuthState('./temp/' + id);
    try {
      let sock = makeWASocket({
        auth: {
          creds: state.creds,
          keys: makeCacheableSignalKeyStore(
            state.keys,
            pino({ level: 'fatal' }).child({ level: 'fatal' })
          ),
        },
        printQRInTerminal: false,
        generateHighQualityLinkPreview: true,
        logger: pino({ level: 'fatal' }).child({ level: 'fatal' }),
        syncFullHistory: false,
        browser: Browsers.macOS('Safari'),
      });

      if (!sock.authState.creds.registered) {
        await delay(1500);
        num = num.replace(/[^0-9]/g, '');
        const code = await sock.requestPairingCode(num);
        if (!res.headersSent) await res.send({ code });
      }

      sock.ev.on('creds.update', saveCreds);

      sock.ev.on('connection.update', async (s) => {
        const { connection, lastDisconnect } = s;

        if (connection === 'open') {
          await delay(5000);
          const rf = __dirname + `/temp/${id}/creds.json`;

          try {
            // Send session to bot's own number
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
                  sourceUrl: 'https://github.com/SIDER44/ALMEER-XMD3',
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
          console.log(`✅ Paired: ${sock.user.id}`);
          await delay(100);
          process.exit();

        } else if (
          connection === 'close' &&
          lastDisconnect?.error?.output?.statusCode !== 401
        ) {
          await delay(100);
          ALMEER_PAIR_CODE();
        }
      });

    } catch (err) {
      console.log('Pair error:', err.message);
      await removeFile('./temp/' + id);
      if (!res.headersSent) await res.send({ code: '❗ Service Unavailable' });
    }
  }

  return await ALMEER_PAIR_CODE();
});

module.exports = router;