const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 4200;
let words;

require('fs').readFile(path.join(__dirname, 'bg-BG.dic'), 'utf8', (_, data) => {
  data = data.split('\r\n').filter((f) => f);
  data.sort((a, b) => a.length - b.length);
  words = JSON.stringify(data);
});

app.use(express.static(path.join(__dirname, 'src')));

app.get('/words', (_, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(words);
});

app.get('/*', (_, res) => {
  res.sendFile(path.join(__dirname, 'src', 'index.html'));
});

app.listen(PORT, () => {
  console.log('Server started on port ' + PORT);
});
