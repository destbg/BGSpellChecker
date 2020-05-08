const express = require('express');
const path = require('path');
const fs = require('fs');
const helmet = require('helmet');
const SpellChecker = require('./spellcheck');

const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const PORT = process.env.PORT || 4200;

const words = fs
  .readFileSync(path.join(__dirname, 'bg-BG.txt'), 'utf8')
  .split('\n')
  .filter((f) => f);
words.sort((a, b) => a.length - b.length);

fs.mkdirSync(path.join(__dirname, 'src', 'lib', 'socket.io'), {
  recursive: true,
});

fs.mkdirSync(path.join(__dirname, 'src', 'lib', 'dompurify'), {
  recursive: true,
});

fs.copyFileSync(
  path.join(
    __dirname,
    'node_modules',
    'socket.io-client',
    'dist',
    'socket.io.js',
  ),
  path.join(__dirname, 'src', 'lib', 'socket.io', 'socket.io.js'),
);

fs.copyFileSync(
  path.join(__dirname, 'node_modules', 'dompurify', 'dist', 'purify.min.js'),
  path.join(__dirname, 'src', 'lib', 'dompurify', 'purify.js'),
);

app.use(helmet());
app.use(express.static(path.join(__dirname, 'src')));

io.on('connection', (sock) => {
  const spell = new SpellChecker(words);

  sock.on('check', (text) => {
    if (typeof text != 'string') return;

    sock.emit('checked', spell.checkText(text));
  });

  sock.on('similarity', (word) => {
    if (typeof word != 'string') return;

    sock.emit('string-similarity', spell.findBestMatch(word));
  });
});

app.get('/*', (_, res) => {
  res.sendFile(path.join(__dirname, 'src', 'index.html'));
});

http.listen(PORT, () => {
  console.log('Server started on port ' + PORT);
});
