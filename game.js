const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const hudLevel = document.getElementById('hud-level');
const hudScore = document.getElementById('hud-score');
const hudCoins = document.getElementById('hud-coins');
const hudLives = document.getElementById('hud-lives');
const message = document.getElementById('message');

document.getElementById('restart').addEventListener('click', () => initGame());

const TILE = 48;
const GRAVITY = 1800;
const keys = new Set();

const LEVELS = [
  {
    width: 110,
    start: { x: 2 * TILE, y: 6 * TILE },
    goalX: 100 * TILE,
    platforms: [
      { x: 0, y: 9, w: 110, h: 2 },
      { x: 8, y: 7, w: 3, h: 1 },
      { x: 16, y: 6, w: 4, h: 1 },
      { x: 27, y: 7, w: 4, h: 1 },
      { x: 36, y: 5, w: 3, h: 1 },
      { x: 45, y: 7, w: 5, h: 1 },
      { x: 58, y: 6, w: 4, h: 1 },
      { x: 70, y: 7, w: 3, h: 1 },
      { x: 78, y: 5, w: 4, h: 1 },
      { x: 88, y: 7, w: 3, h: 1 }
    ],
    blocks: [12,13,14,24,25,38,39,40,52,65,66,67,84,85].map(x => ({ x, y: 4 })),
    enemies: [
      { x: 20, y: 8, min: 18, max: 31, speed: 60 },
      { x: 49, y: 8, min: 45, max: 57, speed: 65 },
      { x: 74, y: 8, min: 70, max: 83, speed: 55 }
    ],
    coins: [9,10,11,18,19,28,29,30,31,37,47,48,59,60,61,71,79,80,81,89,90].map(x => ({x, y: 3}))
  },
  {
    width: 120,
    start: { x: 2 * TILE, y: 6 * TILE },
    goalX: 110 * TILE,
    platforms: [
      { x: 0, y: 9, w: 120, h: 2 },
      { x: 10, y: 7, w: 5, h: 1 },
      { x: 21, y: 6, w: 3, h: 1 },
      { x: 33, y: 5, w: 4, h: 1 },
      { x: 48, y: 7, w: 6, h: 1 },
      { x: 65, y: 6, w: 5, h: 1 },
      { x: 82, y: 5, w: 4, h: 1 },
      { x: 95, y: 7, w: 6, h: 1 }
    ],
    blocks: [15,16,17,34,35,36,50,51,52,75,76,77,98,99].map(x => ({ x, y: 4 })),
    enemies: [
      { x: 14, y: 8, min: 10, max: 20, speed: 70 },
      { x: 39, y: 8, min: 33, max: 47, speed: 75 },
      { x: 57, y: 8, min: 48, max: 64, speed: 80 },
      { x: 87, y: 8, min: 80, max: 96, speed: 70 }
    ],
    coins: [11,12,13,22,23,24,34,35,36,49,50,51,52,66,67,68,83,84,85,96,97,98].map(x => ({x, y: 3}))
  },
  {
    width: 132,
    start: { x: 2 * TILE, y: 6 * TILE },
    goalX: 122 * TILE,
    platforms: [
      { x: 0, y: 9, w: 132, h: 2 },
      { x: 11, y: 7, w: 3, h: 1 },
      { x: 19, y: 6, w: 3, h: 1 },
      { x: 28, y: 5, w: 3, h: 1 },
      { x: 42, y: 7, w: 4, h: 1 },
      { x: 56, y: 6, w: 4, h: 1 },
      { x: 71, y: 5, w: 4, h: 1 },
      { x: 88, y: 7, w: 5, h: 1 },
      { x: 107, y: 6, w: 4, h: 1 }
    ],
    blocks: [13,14,21,22,23,38,39,40,57,58,59,72,73,74,90,91,92,109,110].map(x => ({ x, y: 4 })),
    enemies: [
      { x: 25, y: 8, min: 19, max: 33, speed: 90 },
      { x: 46, y: 8, min: 42, max: 55, speed: 95 },
      { x: 77, y: 8, min: 71, max: 87, speed: 90 },
      { x: 100, y: 8, min: 93, max: 107, speed: 100 }
    ],
    coins: [12,13,14,20,21,22,29,30,31,43,44,45,57,58,59,72,73,74,89,90,91,108,109].map(x => ({x, y: 3}))
  }
];

let state;
let last = 0;

function initGame() {
  state = {
    levelIndex: 0,
    score: 0,
    coins: 0,
    lives: 3,
    won: false
  };
  loadLevel(0);
  message.textContent = 'Clear all 3 levels to win!';
}

function loadLevel(index) {
  const source = LEVELS[index];
  state.level = {
    ...source,
    blocks: source.blocks.map(b => ({ ...b, hit: false })),
    coins: source.coins.map(c => ({ ...c, taken: false })),
    enemies: source.enemies.map(e => ({ ...e, dir: 1, alive: true }))
  };
  state.player = {
    x: source.start.x,
    y: source.start.y,
    vx: 0,
    vy: 0,
    w: 34,
    h: 44,
    onGround: false,
    invincibleTimer: 0
  };
  state.cameraX = 0;
  updateHud();
}

function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function worldRect(tileRect) {
  return { x: tileRect.x * TILE, y: tileRect.y * TILE, w: tileRect.w * TILE, h: tileRect.h * TILE };
}

function allSolids() {
  const platformRects = state.level.platforms.map(worldRect);
  const blockRects = state.level.blocks.map(b => ({ x: b.x * TILE, y: b.y * TILE, w: TILE, h: TILE }));
  return platformRects.concat(blockRects);
}

function hurtPlayer() {
  if (state.player.invincibleTimer > 0) return;
  state.lives -= 1;
  state.player.invincibleTimer = 2;
  if (state.lives <= 0) {
    message.textContent = 'Game over! Restarting from level 1...';
    initGame();
    return;
  }
  const start = state.level.start;
  Object.assign(state.player, { x: start.x, y: start.y, vx: 0, vy: 0 });
  message.textContent = `Ouch! ${state.lives} lives left.`;
  updateHud();
}

function physics(dt) {
  const p = state.player;
  const run = keys.has('ShiftLeft') || keys.has('ShiftRight');
  const speed = run ? 340 : 240;
  const accel = p.onGround ? 2000 : 1200;

  if (keys.has('ArrowLeft')) p.vx = Math.max(p.vx - accel * dt, -speed);
  else if (keys.has('ArrowRight')) p.vx = Math.min(p.vx + accel * dt, speed);
  else p.vx *= p.onGround ? 0.7 : 0.94;

  if ((keys.has('Space') || keys.has('ArrowUp')) && p.onGround) {
    p.vy = -680;
    p.onGround = false;
  }

  p.vy += GRAVITY * dt;
  const solids = allSolids();

  p.x += p.vx * dt;
  for (const s of solids) {
    if (rectsOverlap(p, s)) {
      if (p.vx > 0) p.x = s.x - p.w;
      else if (p.vx < 0) p.x = s.x + s.w;
      p.vx = 0;
    }
  }

  p.y += p.vy * dt;
  p.onGround = false;
  for (const s of solids) {
    if (rectsOverlap(p, s)) {
      if (p.vy > 0) {
        p.y = s.y - p.h;
        p.vy = 0;
        p.onGround = true;
      } else if (p.vy < 0) {
        p.y = s.y + s.h;
        p.vy = 0;
        const block = state.level.blocks.find(b => b.x * TILE === s.x && b.y * TILE === s.y && !b.hit);
        if (block) {
          block.hit = true;
          state.coins += 1;
          state.score += 100;
        }
      }
    }
  }

  if (p.y > canvas.height + 400) hurtPlayer();
  if (p.invincibleTimer > 0) p.invincibleTimer -= dt;

  state.cameraX = Math.max(0, Math.min(p.x - canvas.width * 0.35, state.level.width * TILE - canvas.width));
}

function updateEnemies(dt) {
  const p = state.player;
  for (const enemy of state.level.enemies) {
    if (!enemy.alive) continue;
    enemy.x += enemy.speed * enemy.dir * dt / TILE;
    if (enemy.x <= enemy.min || enemy.x >= enemy.max) enemy.dir *= -1;

    const er = { x: enemy.x * TILE + 6, y: enemy.y * TILE + 10, w: 36, h: 34 };
    if (!rectsOverlap(p, er)) continue;

    if (p.vy > 50 && p.y + p.h - 10 < er.y) {
      enemy.alive = false;
      p.vy = -420;
      state.score += 250;
      message.textContent = 'Nice stomp!';
    } else {
      hurtPlayer();
    }
  }
}

function collectCoins() {
  const p = state.player;
  for (const coin of state.level.coins) {
    if (coin.taken) continue;
    const cr = { x: coin.x * TILE + 12, y: coin.y * TILE + 12, w: 24, h: 24 };
    if (rectsOverlap(p, cr)) {
      coin.taken = true;
      state.coins += 1;
      state.score += 50;
    }
  }
}

function progressLevel() {
  if (state.player.x < state.level.goalX) return;
  state.levelIndex += 1;
  if (state.levelIndex >= LEVELS.length) {
    state.won = true;
    message.textContent = `You win! Final score: ${state.score}. Press restart to play again.`;
    updateHud();
    return;
  }
  loadLevel(state.levelIndex);
  message.textContent = `Level ${state.levelIndex + 1} starts!`;
}

function updateHud() {
  hudLevel.textContent = `Level: ${Math.min(state.levelIndex + 1, LEVELS.length)}`;
  hudScore.textContent = `Score: ${state.score}`;
  hudCoins.textContent = `Coins: ${state.coins}`;
  hudLives.textContent = `Lives: ${state.lives}`;
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.translate(-state.cameraX, 0);

  ctx.fillStyle = '#99ddff';
  ctx.fillRect(state.cameraX, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#5dc64f';
  for (const p of state.level.platforms) {
    ctx.fillRect(p.x * TILE, p.y * TILE, p.w * TILE, p.h * TILE);
    ctx.fillStyle = '#3d9438';
    ctx.fillRect(p.x * TILE, p.y * TILE, p.w * TILE, 8);
    ctx.fillStyle = '#5dc64f';
  }

  for (const b of state.level.blocks) {
    ctx.fillStyle = b.hit ? '#9b6b3b' : '#f0a43b';
    ctx.fillRect(b.x * TILE + 4, b.y * TILE + 4, TILE - 8, TILE - 8);
  }

  ctx.fillStyle = '#ffd84d';
  for (const c of state.level.coins) {
    if (c.taken) continue;
    ctx.beginPath();
    ctx.arc(c.x * TILE + TILE / 2, c.y * TILE + TILE / 2, 11, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const e of state.level.enemies) {
    if (!e.alive) continue;
    const x = e.x * TILE;
    const y = e.y * TILE;
    ctx.fillStyle = '#8a4a2f';
    ctx.fillRect(x + 6, y + 10, 36, 34);
    ctx.fillStyle = '#f5e9dc';
    ctx.fillRect(x + 12, y + 20, 8, 6);
    ctx.fillRect(x + 28, y + 20, 8, 6);
  }

  const p = state.player;
  const blink = p.invincibleTimer > 0 && Math.floor(p.invincibleTimer * 8) % 2 === 0;
  if (!blink) {
    ctx.fillStyle = '#e43f3f';
    ctx.fillRect(p.x, p.y, p.w, 18);
    ctx.fillStyle = '#2366d1';
    ctx.fillRect(p.x, p.y + 18, p.w, p.h - 18);
    ctx.fillStyle = '#ffddb6';
    ctx.fillRect(p.x + 8, p.y + 4, 18, 12);
  }

  ctx.fillStyle = '#fff';
  ctx.fillRect(state.level.goalX + 30, 6 * TILE, 8, 3 * TILE);
  ctx.fillStyle = '#31c4ff';
  ctx.fillRect(state.level.goalX + 38, 6 * TILE, 32, 20);

  ctx.restore();
}

function loop(ts) {
  const dt = Math.min((ts - last) / 1000, 1 / 30);
  last = ts;

  if (!state.won) {
    physics(dt);
    updateEnemies(dt);
    collectCoins();
    progressLevel();
    updateHud();
  }
  draw();
  requestAnimationFrame(loop);
}

window.addEventListener('keydown', (e) => {
  if (['ArrowLeft','ArrowRight','ArrowUp','Space','ShiftLeft','ShiftRight'].includes(e.code)) e.preventDefault();
  keys.add(e.code);
});
window.addEventListener('keyup', (e) => keys.delete(e.code));

initGame();
requestAnimationFrame((t) => {
  last = t;
  requestAnimationFrame(loop);
});
