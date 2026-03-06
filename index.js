const express    = require('express');
const app        = express();
const bodyParser = require('body-parser');
const PORT = process.env.PORT || 8080;

__path = process.cwd();

let server = require('./qr'),
    code   = require('./pair');

require('events').EventEmitter.defaultMaxListeners = 500;

app.use('/server', server);
app.use('/code',   code);
app.use('/pair', async (req, res) => res.sendFile(__path + '/pair.html'));
app.use('/qr',   async (req, res) => res.sendFile(__path + '/qr.html'));
app.use('/',     async (req, res) => res.sendFile(__path + '/main.html'));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════╗
║       🤖  ALMEER XMD — PAIRING       ║
╠══════════════════════════════════════╣
║  🌐 Server  : http://localhost:${PORT}  ║
║  📱 Pair    : /pair                  ║
║  📷 QR Code : /qr                   ║
╚══════════════════════════════════════╝
  `);
});

module.exports = app;
