const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayText = document.getElementById('overlay-text');
const actionButton = document.getElementById('action-button');

const scoreEl = document.getElementById('score');
const livesEl = document.getElementById('lives');
const timerEl = document.getElementById('timer');

const GAME_WIDTH = canvas.width;
const GAME_HEIGHT = canvas.height;
const GROUND_Y = 420;
const GOAL_STARS = 12;

const world = {
  gravity: 0.55,
  moveSpeed: 4.2,
  jumpSpeed: 12,
  friction: 0.82,
};

const keys = {};
let platforms = [];
let stars = [];
let slimes = [];
let particles = [];
let player;
let gameRunning = false;
let lastTime = 0;
let timeLeft = 90;

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

function createLevel() {
  platforms = [
    { x: 0, y: GROUND_Y, w: GAME_WIDTH, h: GAME_HEIGHT - GROUND_Y },
    { x: 120, y: 350, w: 130, h: 20 },
    { x: 320, y: 300, w: 140, h: 20 },
    { x: 520, y: 250, w: 120, h: 20 },
    { x: 700, y: 315, w: 140, h: 20 },
    { x: 710, y: 190, w: 180, h: 20 },
  ];

  stars = Array.from({ length: GOAL_STARS }, (_, i) => {
    const platform = platforms[1 + (i % (platforms.length - 1))];
    return {
      x: rand(platform.x + 20, platform.x + platform.w - 20),
      y: platform.y - rand(24, 42),
      r: 10,
      collected: false,
    };
  });

  slimes = [
    { x: 380, y: 280, w: 34, h: 20, vx: 1.2, minX: 330, maxX: 430 },
    { x: 560, y: 230, w: 34, h: 20, vx: 1.5, minX: 530, maxX: 615 },
    { x: 760, y: 170, w: 34, h: 20, vx: 1.6, minX: 720, maxX: 865 },
  ];
}

function createPlayer() {
  player = {
    x: 45,
    y: GROUND_Y - 58,
    w: 38,
    h: 58,
    vx: 0,
    vy: 0,
    onGround: false,
    stars: 0,
    lives: 3,
    invulnerable: 0,
  };
}

function resetPlayerPosition() {
  player.x = 45;
  player.y = GROUND_Y - 58;
  player.vx = 0;
  player.vy = 0;
  player.onGround = false;
  player.invulnerable = 1.5;
}

function intersects(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function starBurst(x, y) {
  for (let i = 0; i < 14; i += 1) {
    particles.push({
      x,
      y,
      vx: rand(-2.2, 2.2),
      vy: rand(-2.4, -0.7),
      life: rand(0.35, 0.75),
    });
  }
}

function update(delta) {
  if (!gameRunning) return;

  timeLeft -= delta;
  if (timeLeft <= 0) {
    timeLeft = 0;
    endGame(false, "Time's up!");
  }

  if (player.invulnerable > 0) {
    player.invulnerable -= delta;
  }

  const left = keys.ArrowLeft || keys.KeyA;
  const right = keys.ArrowRight || keys.KeyD;

  if (left && !right) player.vx -= world.moveSpeed * delta * 1.7;
  if (right && !left) player.vx += world.moveSpeed * delta * 1.7;
  player.vx *= world.friction;
  player.vx = Math.max(-world.moveSpeed, Math.min(world.moveSpeed, player.vx));

  player.vy += world.gravity;
  player.x += player.vx;
  player.y += player.vy;
  player.onGround = false;

  for (const platform of platforms) {
    if (!intersects(player, platform)) continue;

    const prevBottom = player.y - player.vy + player.h;
    const prevTop = player.y - player.vy;

    if (prevBottom <= platform.y && player.vy >= 0) {
      player.y = platform.y - player.h;
      player.vy = 0;
      player.onGround = true;
    } else if (prevTop >= platform.y + platform.h && player.vy < 0) {
      player.y = platform.y + platform.h;
      player.vy = 0;
    } else if (player.x + player.w / 2 < platform.x + platform.w / 2) {
      player.x = platform.x - player.w;
      player.vx = 0;
    } else {
      player.x = platform.x + platform.w;
      player.vx = 0;
    }
  }

  if (player.y > GAME_HEIGHT + 140) {
    player.lives -= 1;
    if (player.lives <= 0) {
      endGame(false, 'You fell into the void.');
    } else {
      resetPlayerPosition();
    }
  }

  for (const star of stars) {
    if (star.collected) continue;
    const hitbox = { x: star.x - star.r, y: star.y - star.r, w: star.r * 2, h: star.r * 2 };
    if (intersects(player, hitbox)) {
      star.collected = true;
      player.stars += 1;
      starBurst(star.x, star.y);
      if (player.stars === GOAL_STARS) {
        endGame(true, 'You gathered every star!');
      }
    }
  }

  for (const slime of slimes) {
    slime.x += slime.vx;
    if (slime.x < slime.minX || slime.x + slime.w > slime.maxX) {
      slime.vx *= -1;
    }

    if (intersects(player, slime) && player.invulnerable <= 0) {
      player.lives -= 1;
      if (player.lives <= 0) {
        endGame(false, 'You were slimed.');
      } else {
        resetPlayerPosition();
      }
    }
  }

  particles = particles.filter((particle) => particle.life > 0);
  for (const particle of particles) {
    particle.x += particle.vx;
    particle.y += particle.vy;
    particle.vy += 0.07;
    particle.life -= delta;
  }

  draw();
  updateHud();
}

function drawStar(x, y, r) {
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  for (let i = 0; i < 5; i += 1) {
    ctx.lineTo(Math.cos((18 + i * 72) * Math.PI / 180) * r, -Math.sin((18 + i * 72) * Math.PI / 180) * r);
    ctx.lineTo(Math.cos((54 + i * 72) * Math.PI / 180) * (r * 0.45), -Math.sin((54 + i * 72) * Math.PI / 180) * (r * 0.45));
  }
  ctx.closePath();
  ctx.fillStyle = '#ffe66d';
  ctx.fill();
  ctx.restore();
}

function draw() {
  ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < 10; i += 1) {
    ctx.beginPath();
    ctx.arc(80 + i * 95, 70 + ((i % 2) * 14), 20 + (i % 3) * 7, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const platform of platforms) {
    ctx.fillStyle = platform.y === GROUND_Y ? '#427f42' : '#6d4c41';
    ctx.fillRect(platform.x, platform.y, platform.w, platform.h);
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(platform.x, platform.y, platform.w, 4);
  }

  for (const star of stars) {
    if (!star.collected) drawStar(star.x, star.y, star.r);
  }

  for (const slime of slimes) {
    ctx.fillStyle = '#3ddf84';
    ctx.fillRect(slime.x, slime.y, slime.w, slime.h);
    ctx.fillStyle = '#16381f';
    ctx.fillRect(slime.x + 6, slime.y + 6, 5, 5);
    ctx.fillRect(slime.x + slime.w - 11, slime.y + 6, 5, 5);
  }

  for (const particle of particles) {
    ctx.globalAlpha = Math.max(0, particle.life * 1.3);
    drawStar(particle.x, particle.y, 4);
    ctx.globalAlpha = 1;
  }

  const blink = player.invulnerable > 0 && Math.floor(player.invulnerable * 10) % 2 === 0;
  if (!blink) {
    ctx.fillStyle = '#ef4f4f';
    ctx.fillRect(player.x, player.y, player.w, player.h);
    ctx.fillStyle = '#ffd3d3';
    ctx.fillRect(player.x + 6, player.y + 10, player.w - 12, 20);
    ctx.fillStyle = '#0e182c';
    ctx.fillRect(player.x + 9, player.y + 42, 9, 10);
    ctx.fillRect(player.x + player.w - 18, player.y + 42, 9, 10);
  }
}

function updateHud() {
  scoreEl.textContent = `Stars: ${player.stars} / ${GOAL_STARS}`;
  livesEl.textContent = `Lives: ${player.lives}`;
  timerEl.textContent = `Time: ${Math.ceil(timeLeft)}`;
}

function gameLoop(timestamp) {
  const delta = Math.min(0.033, (timestamp - lastTime) / 1000 || 0.016);
  lastTime = timestamp;
  update(delta);
  requestAnimationFrame(gameLoop);
}

function showOverlay(title, text, buttonLabel) {
  overlayTitle.textContent = title;
  overlayText.textContent = text;
  actionButton.textContent = buttonLabel;
  overlay.classList.add('visible');
}

function hideOverlay() {
  overlay.classList.remove('visible');
}

function startGame() {
  createLevel();
  createPlayer();
  particles = [];
  timeLeft = 90;
  gameRunning = true;
  hideOverlay();
  updateHud();
  draw();
}

function endGame(won, reason) {
  gameRunning = false;
  const title = won ? 'You Win! 🎉' : 'Game Over';
  const text = won
    ? `Amazing run! You collected ${GOAL_STARS} stars with ${Math.max(player.lives, 0)} lives left.`
    : `${reason} You collected ${player.stars} stars.`;
  showOverlay(title, text, won ? 'Play Again' : 'Try Again');
}

function attemptJump() {
  if (!gameRunning) return;
  if (player.onGround) {
    player.vy = -world.jumpSpeed;
    player.onGround = false;
  }
}

actionButton.addEventListener('click', startGame);

window.addEventListener('keydown', (event) => {
  keys[event.code] = true;

  if (event.code === 'Space' || event.code === 'ArrowUp' || event.code === 'KeyW') {
    event.preventDefault();
    attemptJump();
  }

  if (!gameRunning && event.code === 'Enter') {
    startGame();
  }
});

window.addEventListener('keyup', (event) => {
  keys[event.code] = false;
});

showOverlay('Star Hopper', 'Run, jump, and collect all stars before the clock reaches zero.', 'Start Game');
createLevel();
createPlayer();
updateHud();
draw();
requestAnimationFrame(gameLoop);
