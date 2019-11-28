const express = require("express");
const bodyParser = require('body-parser');
const cors = require('cors');

const promisify = require('util').promisify;
const path = require('path');
const fs = require('fs');

const readdirp = promisify(fs.readdir);
const statp = promisify(fs.stat);
const readFile = promisify(fs.readFile);

const { exec } = require('child_process');

const config = require('./config.json');

async function scan(directoryName, recursive = true) {
  let results = [];
  let files = await readdirp(directoryName);

  for (let f of files) {
    let fullPath = path.join(directoryName, f);
    let stat = await statp(fullPath);

    if (stat.isDirectory()) {
      if (recursive) {
        await scan(fullPath, results);
      }
    } else {
      results.push(f);
    }
  }

  return results;
}

const port = 3001;
const app = express(); app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// https://medium.com/@alexishevia/using-cors-in-express-cac7e29b005b
const allowedOrigins = [
  'http://localhost:3000',
  config.domain
];
app.use(cors({
  origin: function (origin, callback) {    
    // allow requests with no origin 
    // (like mobile apps or curl requests)
    if (!origin) {
      return callback(null, true); 
    }
    
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';

      return callback(new Error(msg), false);
    } 
    
    return callback(null, true);
  }
}));

app.get('/config', (req, res) => {
  res.json(config);
});

app.get('/listPosts', async (req, res) => {
  const { query } = req;
  const { path } = query;

  const posts = await scan(path);

  res.json(posts);
});

app.get('/retrievePost', async (req, res) => {
  const { query } = req;
  const { path } = query;

  const content = await readFile(path, 'utf8');

  // There is currently an error in toml-node that causes an error
  // when the input uses CRLF (\r\n), so for now replace with LF (\n)
  res.json({ file: path, content: content.replace(/\r\n/g, '\n') });
});

app.post('/savePost', (req, res) => {
  const { body } = req;
  const { path, content } = body;

  fs.writeFile(path, content, (err) => {
    res.json({
      success: !err
    });
  });
});

app.post('/deletePost', (req, res) => {
  const { body } = req;
  const { path } = body;

  fs.unlink(path, (err) => {
    res.json({
      success: !err
    });
  });
});

app.post('/buildSite', (req, res) => {
  const { body } = req;
  const { path } = body;

  exec('hugo --minify', { cwd: path }, (err, stdout, stderr) => {
    res.json({
      success: !err
    });
  });
});
