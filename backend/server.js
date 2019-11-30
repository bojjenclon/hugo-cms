const express = require("express");
const router = express.Router();
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const cors = require('cors');

const promisify = require('util').promisify;
const path = require('path');
const fs = require('fs');

const readdirp = promisify(fs.readdir);
const statp = promisify(fs.stat);
const readFile = promisify(fs.readFile);

const { exec } = require('child_process');

const sqlite3 = require('sqlite3').verbose();
const bcrypt = require("bcrypt");
const session = require('express-session');

const config = require('./config.json');
const db = new sqlite3.Database('./db/users.db', async (err) => {
  if (err) {
    console.error(err.message);
  } else {
    console.log('Connected to the users database.');

    db.run(`CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username text UNIQUE, 
      password text,
      CONSTRAINT username_unique UNIQUE (username)
      )`,
      async (err) => {
        if (err) {
          // Table already created
        } else {
          // Table just created, creating some rows
          const insert = 'INSERT INTO users (username, password) VALUES (?, ?)';
          const hashedPassword = await bcrypt.hash(config.password, 10);

          db.run(insert, [config.username, hashedPassword]);

          console.log('Created default user');
        }
      });
  }
});

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
const app = express();
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

app.use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(session({
  name: 'frontend.sid',
  secret: 'f7932cc2-124b-11ea-8d71-362b9e155667',

  resave: true,
  saveUninitialized: true,

  cookie: {
    secure: router.get('env') === 'production', 
    maxAge: 60000,
    expires: false,
    httpOnly: false
  }
}));

app.use(function (req, res, next) {
  res.header('Access-Control-Allow-Credentials', true);
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
  res.header("Access-Control-Allow-Origin", "http://localhost");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  
  next();
});

// https://medium.com/@alexishevia/using-cors-in-express-cac7e29b005b
const allowedOrigins = [
  'localhost',
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
  },

  credentials: true
}));

app.use('/api', router);

router.get('/config', (req, res) => {
  const publicFields = {
    api: config.api,
    
    postPath: config.postPath,
    rootPath: config.rootPath
  };

  res.json(publicFields);
});

router.get('/listPosts', async (req, res) => {
  const { query } = req;
  const { path } = query;

  const posts = await scan(path);

  res.json(posts);
});

router.get('/retrievePost', async (req, res) => {
  const { query } = req;
  const { path } = query;

  const content = await readFile(path, 'utf8');

  // There is currently an error in toml-node that causes an error
  // when the input uses CRLF (\r\n), so for now replace with LF (\n)
  res.json({ file: path, content: content.replace(/\r\n/g, '\n') });
});

router.post('/savePost', (req, res) => {
  const { body } = req;
  const { path, content } = body;

  fs.writeFile(path, content, (err) => {
    res.json({
      success: !err
    });
  });
});

router.post('/deletePost', (req, res) => {
  const { body } = req;
  const { path } = body;

  fs.unlink(path, (err) => {
    res.json({
      success: !err
    });
  });
});

router.post('/buildSite', (req, res) => {
  const { body } = req;
  const { path } = body;

  exec('hugo --minify', { cwd: path }, (err, stdout, stderr) => {
    res.json({
      success: !err
    });
  });
});

router.post('/login', (req, res) => {
  const { body } = req;
  const { username, password } = body;

  const sql = 'SELECT * FROM users WHERE username = ?';
  const params = [username];

  db.get(sql, params, async (err, row) => {
      if (err){
        res.status(400).json({
          "error": err.message
        })

        return;
      }

      const arePasswordsSame = await bcrypt.compare(password, row.password);
      if (arePasswordsSame) {
        req.session.userId = row.id;
        req.session.username = row.username;

        res.status(200)
          .json({
            "message": "success",
            "data": row
          });
      } else {
        res.status(400)
          .json({
            "message": "fail"
          });
      }
  });
});

router.get('/isLoggedIn', (req, res) => {
  res.json({
    success: !!req.session.userId
  })
});

router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    res.clearCookie('frontend.sid', { path: '/', httpOnly: false })
      .status(200)
      .json({
        success: !err
      });
  })
});

