const express = require('express');
const app = express();
const PORT = process.env.PORT || 4200;
let words;

require('fs').readFile('src/bg-words-cyrillic.txt', 'utf8', (_, data) => {
  data = data.split('\n').filter((f) => f);
  data.sort((a, b) => a.length - b.length);
  words = JSON.stringify(data);
});

app.use(express.static('src'));

app.get('/words', (_, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(words);
});

app.get('/*', (_, res) => {
  res.sendFile('src/index.html');
});

app.listen(PORT, () => {
  console.log('Server started on port ' + PORT);
});
