// server.js — complete backend for the NFT arcade game
// Run with: node server.js
// Install deps: npm install express express-session better-sqlite3 siwe
//
// Ownership checks go through the Art Blocks subgraph on The Graph.
// No ethers / no RPC provider needed.
//
// Routes:
//   GET  /auth/nonce   -> client gets a nonce to sign
//   POST /auth/verify  -> verify SIWE signature + on-chain ownership (via subgraph)
//   POST /game/start   -> logged-in player starts a game (server records start time)
//   POST /game/score   -> submit score; server sanity-checks timing + plausibility
//   GET  /leaderboard  -> top scores (public)

require('dotenv').config();
const express = require('express');
const session = require('express-session');
const Database = require('better-sqlite3');
const { SiweMessage, generateNonce } = require('siwe');

// ---------------------------------------------------------------
// CONFIG — edit these. On a real deploy, set them as environment
// variables instead of editing the file (see comments).
// ---------------------------------------------------------------
const GRAPH_API_KEY = process.env.GRAPH_API_KEY;
const SUBGRAPH_ID   = process.env.SUBGRAPH_ID; // Art Blocks subgraph
const AB_CONTRACT   = process.env.AB_CONTRACT; // core contract (lowercase!)
const PROJECT_ID    = process.env.PROJECT_ID; // AB project number
const SESSION_SECRET = process.env.SESSION_SECRET;

const MAX_PLAUSIBLE_SCORE = 100000; // tune to your game
const MIN_GAME_SECONDS = 2;        // fastest believable playthrough
// ---------------------------------------------------------------

const GRAPH_URL =
  `https://gateway-arbitrum.network.thegraph.com/api/${GRAPH_API_KEY}/subgraphs/id/${SUBGRAPH_ID}`;

// Ask the subgraph: who owns this exact token?
// NOTE the two different id vocabularies in the AB subgraph:
//   Project entity id = "<contract>-<projectId>"   e.g. ...b069-422
//   Token queries take the FULL tokenId             e.g. 422000116
// This function takes the full tokenId.
async function ownsToken(address, tokenId) {
  const res = await fetch(GRAPH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: `{
        tokens(where: { tokenId: "${Number(tokenId)}", contract: "${AB_CONTRACT}" }) {
          owner { id }
        }
      }`
    })
  });
  if (!res.ok) throw new Error(`subgraph HTTP ${res.status}`);
  const { data, errors } = await res.json();
  if (errors) throw new Error('subgraph query error');
  const token = data?.tokens?.[0];
  //console.log(tokenId);
  return token?.owner?.id?.toLowerCase() === address.toLowerCase();
}

// --- Database (a single file, ./data/game.db) ---
const db = new Database('data/game.db');
db.exec(`
  CREATE TABLE IF NOT EXISTS scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    address TEXT NOT NULL,
    tokenId TEXT NOT NULL,
    score INTEGER NOT NULL,
    created_at INTEGER NOT NULL
  )
`);

const app = express();
app.use(express.json());

// Sessions: browser holds an opaque cookie; the real data lives server-side.
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax' } // add secure:true once behind https
}));

// Serve the frontend from ./public
app.use(express.static('public'));

// ---------------------------------------------------------------
// AUTH
// ---------------------------------------------------------------

app.get('/auth/nonce', (req, res) => {
  req.session.nonce = generateNonce();
  res.json({ nonce: req.session.nonce });
});

app.post('/auth/verify', async (req, res) => {
  try {
    const { message, signature, tokenId } = req.body;
    if (!message || !signature || tokenId === undefined) {
      return res.status(400).json({ error: 'missing fields' });
    }

    // 1. Signature proves the sender controls the address.
    const siwe = new SiweMessage(message);
    const { data } = await siwe.verify({ signature, nonce: req.session.nonce });
    req.session.nonce = null; // single-use

    // 2. Token must belong to YOUR project.
    //    Art Blocks tokenId = projectId * 1,000,000 + mint number
    const pid = Math.floor(Number(tokenId) / 1000000);
    if (pid !== Number(PROJECT_ID)) {
      return res.status(403).json({ error: 'token is not from this project' });
    }

    // 3. Ownership check via the subgraph — server-side, never trusting the client.
    if (!(await ownsToken(data.address, tokenId))) {
      return res.status(403).json({ error: 'address does not own this token' });
    }

    // Logged in.
    req.session.address = data.address.toLowerCase();
    req.session.tokenId = String(tokenId);
    res.json({ ok: true, address: req.session.address });
  } catch (err) {
    console.error(err);
    res.status(401).json({ error: 'verification failed' });
  }
});

function requireAuth(req, res, next) {
  if (!req.session.address) return res.status(401).json({ error: 'not logged in' });
  next();
}

// ---------------------------------------------------------------
// GAME
// ---------------------------------------------------------------

app.post('/game/start', requireAuth, (req, res) => {
  req.session.gameStart = Date.now();
  res.json({ ok: true });
});

app.post('/game/score', requireAuth, (req, res) => {
  const score = Number(req.body.score);
  const start = req.session.gameStart;
  //req.session.gameStart = null; // one score per started game

  if (!start) return res.status(400).json({ error: 'no game in progress' });
  if (!Number.isInteger(score) || score < 0 || score > MAX_PLAUSIBLE_SCORE) {
    return res.status(400).json({ error: 'implausible score' });
  }
  if ((Date.now() - start) / 1000 < MIN_GAME_SECONDS) {
    return res.status(400).json({ error: 'game too short' });
  }

  db.prepare(
    'INSERT INTO scores (address, tokenId, score, created_at) VALUES (?, ?, ?, ?)'
  ).run(req.session.address, req.session.tokenId, score, Date.now());

  res.json({ ok: true });
});

// ---------------------------------------------------------------
// LEADERBOARD (public)
// ---------------------------------------------------------------
app.get('/leaderboard', (req, res) => {
  const rows = db.prepare(`
    SELECT address, tokenId, MAX(score) AS best
    FROM scores
    GROUP BY address
    ORDER BY best DESC
    LIMIT 25
  `).all();
  res.json(rows);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`game server on http://localhost:${PORT}`));