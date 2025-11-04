const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const TILE = 16;
const GRAVITY = 0.105; // 0.35 * 0.3
const RUN_ACCEL = 0.09; // 0.3 * 0.3
const MAX_RUN_SPEED = 0.6; // 2 * 0.3
const JUMP_SPEED = 2.25; // 7.5 * 0.3
const MAX_FALL_SPEED = 2.7; // 9 * 0.3

const COLORS = {
    skyTop: '#79c8ff',
    skyBottom: '#b9ecff',
    hud: '#ffffff',
    shadow: '#16425b',
    flagPole: '#f7f1e3',
    flag: '#ff4757',
    castle: '#3d3d3d'
};

const TILE_TYPES = {
    '#': { solid: true, color: '#8b4513' }, // ground
    'B': { solid: true, color: '#c0392b' }, // brick block
    'S': { solid: true, color: '#5f6a6a' }, // stone block
    'P': { solid: true, color: '#2ecc71' }, // pipe
    'Q': { solid: true, color: '#f1c40f', bump: true }, // question block
    'U': { solid: true, color: '#bdc3c7' } // used block
};

const LEVELS = [
    {
        name: 'World 1-1',
        time: 300,
        map: [
            '......................................................................................',
            '......................................................................................',
            '......................................................................................',
            '..............o..............................................o......................F.',
            '.................Q.....................B...........................................##|',
            '....................................................o................................#|',
            '...............................B.....................................................#|',
            '....o............G.................#####.............G.................................#|',
            '.....................#####..............................................o.............#|',
            '......................................................####............................#|',
            '.............P....................................................#####...............#|',
            '.............P.................................................................B......#|',
            '###############################....#############################....####################',
            '@##############################....############################....#####################'
        ]
    },
    {
        name: 'World 1-2',
        time: 280,
        map: [
            '......................................................................................',
            '......................................................................................',
            '......................................................................................',
            '..................................o..................................................F.',
            '.................BBB........................Q..............B.......................##|',
            '...........................................................B.........................#|',
            '......o....................................................B.........................#|',
            '...................G.........................#####...............................o....#|',
            '...............#####..............................................#####...............#|',
            '.............................................P........................................#|',
            '.............................................P..........................G.............#|',
            '....o..................................................o..............................#|',
            '###############################....#############################....####################',
            '@##############################....############################....#####################'
        ]
    },
    {
        name: 'World 1-3',
        time: 260,
        map: [
            '......................................................................................',
            '......................................................................................',
            '...........................................o..........................................',
            '.........................#####......................................................F.',
            '..............o.................................................................B..##|',
            '...................................G..............#####............................##|',
            '...............#####.........................o.....................................##|',
            '...............................B...................................................##|',
            '..............................................................#####.................##|',
            '...........o.........................#####...........................................#|',
            '....................#####..................................................o.........#|',
            '..............G......................................................G...............#|',
            '###############################....#############################....####################',
            '@##############################....############################....#####################'
        ]
    }
];

class Entity {
    constructor(x, y, w, h) {
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
        this.dx = 0;
        this.dy = 0;
        this.onGround = false;
        this.alive = true;
    }

    get left() { return this.x; }
    get right() { return this.x + this.w; }
    get top() { return this.y; }
    get bottom() { return this.y + this.h; }
}

class Player extends Entity {
    constructor(x, y) {
        super(x, y, TILE, TILE * 1.5);
        this.spawnX = x;
        this.spawnY = y;
        this.score = 0;
        this.coins = 0;
        this.lives = 3;
        this.invincibleTimer = 0;
        this.canDoubleJump = false;
    }

    resetToSpawn() {
        this.x = this.spawnX;
        this.y = this.spawnY;
        this.dx = 0;
        this.dy = 0;
        this.onGround = false;
        this.canDoubleJump = false;
    }

    update(keys, prevKeys) {
        if (this.invincibleTimer > 0) {
            this.invincibleTimer--;
        }

        if (keys.ArrowLeft) {
            this.dx = Math.max(this.dx - RUN_ACCEL, -MAX_RUN_SPEED);
        } else if (keys.ArrowRight) {
            this.dx = Math.min(this.dx + RUN_ACCEL, MAX_RUN_SPEED);
        } else {
            this.dx *= 0.8;
            if (Math.abs(this.dx) < 0.05) this.dx = 0;
        }

        // Double jump logic
        const jumpPressed = keys.Space || keys.KeyZ;
        const jumpJustPressed = jumpPressed && !(prevKeys.Space || prevKeys.KeyZ);

        if (jumpJustPressed && this.onGround) {
            // First jump
            this.dy = -JUMP_SPEED;
            this.onGround = false;
            this.canDoubleJump = true;
        } else if (jumpJustPressed && this.canDoubleJump && !this.onGround) {
            // Second jump (double jump)
            this.dy = -JUMP_SPEED;
            this.canDoubleJump = false;
        }

        // Reset double jump when landing
        if (this.onGround) {
            this.canDoubleJump = false;
        }
    }

    draw(offsetX) {
        if (!this.alive) return;
        const flicker = this.invincibleTimer > 0 && Math.floor(this.invincibleTimer / 4) % 2 === 0;
        ctx.fillStyle = flicker ? '#ffeaa7' : '#ff4136';
        ctx.fillRect(Math.floor(this.x - offsetX), Math.floor(this.y), this.w, this.h);
        ctx.fillStyle = '#fff';
        ctx.fillRect(Math.floor(this.x - offsetX + 4), Math.floor(this.y + 6), this.w - 8, this.h / 3);
        ctx.fillStyle = '#2d3436';
        ctx.fillRect(Math.floor(this.x - offsetX + 3), Math.floor(this.y + this.h - 4), this.w - 6, 4);
    }
}

class Enemy extends Entity {
    constructor(x, y) {
        super(x, y, TILE, TILE);
        this.speed = 0.3; // 1 * 0.3
        this.dx = -this.speed;
    }

    update() {
        this.dy = Math.min(this.dy + GRAVITY, MAX_FALL_SPEED);
    }

    draw(offsetX) {
        if (!this.alive) return;
        ctx.fillStyle = '#2ecc71';
        ctx.beginPath();
        ctx.ellipse(Math.floor(this.x - offsetX + this.w / 2), Math.floor(this.y + this.h / 2), this.w / 2, this.h / 2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#145a32';
        ctx.fillRect(Math.floor(this.x - offsetX + 2), Math.floor(this.y + this.h - 4), this.w - 4, 4);
    }
}

class Flag {
    constructor(x, y, height) {
        this.x = x;
        this.y = y;
        this.w = TILE / 2;
        this.h = height;
    }

    draw(offsetX) {
        ctx.fillStyle = COLORS.flagPole;
        ctx.fillRect(Math.floor(this.x - offsetX), Math.floor(this.y - this.h), this.w, this.h);
        ctx.fillStyle = COLORS.flag;
        ctx.beginPath();
        ctx.moveTo(Math.floor(this.x - offsetX + this.w), Math.floor(this.y - this.h + 4));
        ctx.lineTo(Math.floor(this.x - offsetX + this.w + TILE * 1.5), Math.floor(this.y - this.h + TILE));
        ctx.lineTo(Math.floor(this.x - offsetX + this.w), Math.floor(this.y - this.h + TILE * 1.5));
        ctx.closePath();
        ctx.fill();
    }
}

class Coin {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.w = TILE / 2;
        this.h = TILE / 2;
        this.collectTimer = 0;
        this.collected = false;
    }

    update() {
        if (this.collectTimer > 0) {
            this.collectTimer--;
        }
    }

    draw(offsetX) {
        if (this.collected && this.collectTimer === 0) return;
        ctx.fillStyle = '#ffd700';
        const bob = Math.sin(Date.now() / 150) * 2;
        ctx.beginPath();
        ctx.arc(Math.floor(this.x - offsetX + this.w / 2), Math.floor(this.y + bob + this.h / 2), this.w / 2, 0, Math.PI * 2);
        ctx.fill();
    }
}

let levelIndex = 0;
let level = null;
let player = null;
let enemies = [];
let coins = [];
let flag = null;
let keys = {};
let prevKeys = {};
let state = 'title'; // title, playing, levelComplete, gameOver, victory
let stateTimer = 0;
let frameCounter = 0;
let timeLeft = 0;

function parseLevel(index) {
    const data = LEVELS[index];
    const rows = data.map.map(row => row.split(''));
    const levelHeight = rows.length * TILE;
    const levelWidth = rows[0].length * TILE;
    enemies = [];
    coins = [];
    flag = null;
    let spawnX = TILE * 2;
    let spawnY = TILE * 8;

    for (let y = 0; y < rows.length; y++) {
        for (let x = 0; x < rows[y].length; x++) {
            const ch = rows[y][x];
            const worldX = x * TILE;
            const worldY = y * TILE;
            if (ch === 'G') {
                enemies.push(new Enemy(worldX, worldY - TILE));
                rows[y][x] = '.';
            } else if (ch === 'o') {
                coins.push(new Coin(worldX + TILE / 4, worldY - TILE));
                rows[y][x] = '.';
            } else if (ch === 'F') {
                let baseY = worldY;
                for (let gy = y; gy < rows.length; gy++) {
                    const tileChar = rows[gy][x];
                    const tileDef = TILE_TYPES[tileChar];
                    if (tileDef && tileDef.solid) {
                        baseY = gy * TILE;
                        break;
                    }
                }
                flag = new Flag(worldX + TILE / 4, baseY, TILE * 6);
                rows[y][x] = '.';
            } else if (ch === '|') {
                rows[y][x] = '.';
            } else if (ch === '@') {
                spawnX = worldX + TILE / 2;
                spawnY = worldY - TILE * 1.5;
                rows[y][x] = '#';
            }
        }
    }

    level = {
        index,
        name: data.name,
        rows,
        width: levelWidth,
        height: levelHeight
    };

    if (!player) {
        player = new Player(spawnX, spawnY);
    } else {
        player.spawnX = spawnX;
        player.spawnY = spawnY;
        player.resetToSpawn();
    }

    for (const enemy of enemies) {
        enemy.y -= 4;
    }

    timeLeft = data.time;
    frameCounter = 0;
}

function tileAt(x, y) {
    const tx = Math.floor(x / TILE);
    const ty = Math.floor(y / TILE);
    if (!level) return null;
    if (ty < 0 || ty >= level.rows.length || tx < 0 || tx >= level.rows[0].length) {
        return null;
    }
    const ch = level.rows[ty][tx];
    return { ch, def: TILE_TYPES[ch] || null, tx, ty };
}

function handleTileCollision(entity, axis) {
    const minX = Math.floor(entity.left / TILE);
    const maxX = Math.floor((entity.right - 1) / TILE);
    const minY = Math.floor(entity.top / TILE);
    const maxY = Math.floor((entity.bottom - 1) / TILE);

    for (let ty = minY; ty <= maxY; ty++) {
        for (let tx = minX; tx <= maxX; tx++) {
            if (ty < 0 || ty >= level.rows.length || tx < 0 || tx >= level.rows[0].length) continue;
            const ch = level.rows[ty][tx];
            const def = TILE_TYPES[ch];
            if (!def || !def.solid) continue;
            const tileLeft = tx * TILE;
            const tileRight = tileLeft + TILE;
            const tileTop = ty * TILE;
            const tileBottom = tileTop + TILE;

            if (axis === 'horizontal') {
                if (entity.dx > 0) {
                    entity.x = tileLeft - entity.w;
                } else if (entity.dx < 0) {
                    entity.x = tileRight;
                }
                entity.dx = entity instanceof Enemy ? -entity.dx : 0;
            } else {
                if (entity.dy > 0) {
                    entity.y = tileTop - entity.h;
                    entity.dy = 0;
                    entity.onGround = true;
                } else if (entity.dy < 0) {
                    entity.y = tileBottom;
                    entity.dy = 0;
                    if (def.bump && entity instanceof Player) {
                        bumpQuestionBlock(tx, ty);
                    }
                }
            }
        }
    }
}

function bumpQuestionBlock(tx, ty) {
    const row = level.rows[ty];
    if (!row) return;
    if (row[tx] !== 'Q') return;
    row[tx] = 'U';
    const coin = new Coin(tx * TILE + TILE / 4, ty * TILE - TILE);
    coin.collectTimer = 30;
    coin.collected = true;
    coins.push(coin);
    player.score += 200;
    player.coins += 1;
}

function updatePlayer() {
    player.update(keys, prevKeys);
    player.dy = Math.min(player.dy + GRAVITY, MAX_FALL_SPEED);

    player.x += player.dx;
    handleTileCollision(player, 'horizontal');

    player.onGround = false;
    player.y += player.dy;
    handleTileCollision(player, 'vertical');

    if (player.bottom > level.height + TILE * 4) {
        playerFall();
    }
}

function updateEnemies() {
    for (const enemy of enemies) {
        if (!enemy.alive) continue;
        enemy.update();
        enemy.x += enemy.dx;
        handleTileCollision(enemy, 'horizontal');
        enemy.onGround = false;
        enemy.y += enemy.dy;
        handleTileCollision(enemy, 'vertical');

        const aheadX = enemy.dx > 0 ? enemy.right + 1 : enemy.left - 1;
        const supportTile = tileAt(aheadX, enemy.bottom + 1);
        if (!supportTile || !(supportTile.def && supportTile.def.solid)) {
            enemy.dx = -enemy.dx;
        }

        if (!enemy.alive) continue;
        if (rectOverlap(player, enemy)) {
            if (player.dy > 0 && player.bottom - enemy.top < enemy.h / 2) {
                enemy.alive = false;
                player.dy = -JUMP_SPEED / 1.5;
                player.score += 100;
            } else if (player.invincibleTimer === 0) {
                hitPlayer();
            }
        }
    }
}

function updateCoins() {
    for (const coin of coins) {
        if (!coin.collected && rectOverlap(player, coin)) {
            coin.collected = true;
            coin.collectTimer = 30;
            player.score += 100;
            player.coins += 1;
        }
        coin.update();
    }
}

function updateFlag() {
    if (!flag) return;
    const flagRect = { x: flag.x, y: flag.y - flag.h, w: flag.w, h: flag.h };
    if (rectOverlap(player, flagRect)) {
        completeLevel();
    }
}

function rectOverlap(a, b) {
    return a.left < b.x + b.w && a.right > b.x && a.top < b.y + b.h && a.bottom > b.y;
}

function playerFall() {
    if (state !== 'playing') return;
    hitPlayer();
}

function hitPlayer() {
    if (player.invincibleTimer > 0) return;
    player.lives -= 1;
    player.invincibleTimer = 120;
    if (player.lives <= 0) {
        state = 'gameOver';
        stateTimer = 180;
    } else {
        player.resetToSpawn();
        timeLeft = LEVELS[levelIndex].time;
        frameCounter = 0;
    }
}

function completeLevel() {
    state = 'levelComplete';
    stateTimer = 180;
    player.score += Math.max(0, timeLeft) * 5;
    frameCounter = 0;
}

function updateTimer() {
    if (state !== 'playing') return;
    if (frameCounter > 0 && frameCounter % 60 === 0 && timeLeft > 0) {
        timeLeft--;
        if (timeLeft === 0) {
            playerFall();
        }
    }
}

function drawBackground(cameraX) {
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, COLORS.skyTop);
    gradient.addColorStop(1, COLORS.skyBottom);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    const cloudOffset = (Date.now() / 20) % (canvas.width + 200);
    for (let i = 0; i < 3; i++) {
        const cloudX = (i * 200 - cloudOffset) + (cameraX * 0.2 % (canvas.width + 200));
        const cloudY = 40 + i * 30;
        drawCloud(cloudX, cloudY);
    }
}

function drawCloud(x, y) {
    ctx.beginPath();
    ctx.arc(x, y, 20, Math.PI * 0.5, Math.PI * 1.5);
    ctx.arc(x + 20, y - 20, 20, Math.PI, Math.PI * 2);
    ctx.arc(x + 40, y - 10, 20, Math.PI, Math.PI * 2);
    ctx.arc(x + 60, y + 10, 20, Math.PI * 1.5, Math.PI * 0.5);
    ctx.closePath();
    ctx.fill();
}

function drawLevel(cameraX) {
    for (let y = 0; y < level.rows.length; y++) {
        for (let x = 0; x < level.rows[y].length; x++) {
            const ch = level.rows[y][x];
            const def = TILE_TYPES[ch];
            if (!def) continue;
            const drawX = x * TILE - cameraX;
            const drawY = y * TILE;
            ctx.fillStyle = def.color;
            ctx.fillRect(Math.floor(drawX), Math.floor(drawY), TILE, TILE);
        }
    }

    ctx.fillStyle = COLORS.castle;
    const castleX = level.width - cameraX - TILE * 6;
    ctx.fillRect(Math.floor(castleX), canvas.height - TILE * 4, TILE * 4, TILE * 4);
    ctx.fillRect(Math.floor(castleX + TILE * 4), canvas.height - TILE * 3, TILE, TILE * 3);
}

function drawHUD() {
    ctx.fillStyle = COLORS.shadow;
    ctx.fillRect(0, 0, canvas.width, 40);
    ctx.fillStyle = COLORS.hud;
    ctx.font = '14px monospace';
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    ctx.fillText(`MARIO  ${String(player.score).padStart(6, '0')}`, 10, 12);
    ctx.fillText(`COINS  x${player.coins}`, 150, 12);
    ctx.fillText(`WORLD  ${level.name}`, 280, 12);
    ctx.fillText(`TIME   ${timeLeft}`, 400, 12);
    ctx.fillText(`LIVES  ${player.lives}`, 520, 12);
}

function drawStateOverlay() {
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    if (state === 'title') {
        ctx.font = '32px monospace';
        ctx.fillText('Super JS Mario', canvas.width / 2, canvas.height / 2 - 60);
        ctx.font = '16px monospace';
        ctx.fillText(level.name, canvas.width / 2, canvas.height / 2 - 20);
        ctx.fillText('Press Enter to Start', canvas.width / 2, canvas.height / 2);
        ctx.fillText('Arrow Keys to Move, Space/Z to Jump', canvas.width / 2, canvas.height / 2 + 30);
    } else if (state === 'levelComplete') {
        ctx.font = '28px monospace';
        ctx.fillText('Course Clear!', canvas.width / 2, canvas.height / 2 - 20);
        ctx.font = '16px monospace';
        ctx.fillText(level.name, canvas.width / 2, canvas.height / 2 + 10);
        const nextLevel = LEVELS[levelIndex + 1];
        if (nextLevel) {
            ctx.fillText(`Up Next: ${nextLevel.name}`, canvas.width / 2, canvas.height / 2 + 40);
        }
    } else if (state === 'gameOver') {
        ctx.font = '28px monospace';
        ctx.fillText('Game Over', canvas.width / 2, canvas.height / 2 - 20);
        ctx.font = '16px monospace';
        ctx.fillText('Press Enter to try again', canvas.width / 2, canvas.height / 2 + 20);
    } else if (state === 'victory') {
        ctx.font = '28px monospace';
        ctx.fillText('Thank you for playing!', canvas.width / 2, canvas.height / 2 - 20);
        ctx.font = '16px monospace';
        ctx.fillText(`Final Score: ${player.score}`, canvas.width / 2, canvas.height / 2 + 20);
        ctx.fillText('Press Enter to return to the title screen', canvas.width / 2, canvas.height / 2 + 50);
    }
    ctx.textAlign = 'left';
}

function updateGame() {
    if (state === 'title' || state === 'gameOver' || state === 'victory') {
        return;
    }

    if (state === 'levelComplete') {
        stateTimer--;
        if (stateTimer <= 0) {
            advanceLevel();
        }
        return;
    }

    frameCounter++;

    updateTimer();
    updatePlayer();
    updateEnemies();
    updateCoins();
    updateFlag();

    // Update previous keys state for next frame
    prevKeys = { ...keys };
}

function drawGame() {
    const cameraX = Math.max(0, Math.min(player.x - canvas.width / 2, level.width - canvas.width));

    drawBackground(cameraX);
    drawLevel(cameraX);

    for (const coin of coins) {
        coin.draw(cameraX);
    }

    if (flag) {
        flag.draw(cameraX);
    }

    for (const enemy of enemies) {
        enemy.draw(cameraX);
    }

    player.draw(cameraX);
    drawHUD();

    if (state !== 'playing') {
        drawStateOverlay();
    }
}

function advanceLevel() {
    levelIndex++;
    if (levelIndex >= LEVELS.length) {
        state = 'victory';
        return;
    }
    parseLevel(levelIndex);
    state = 'playing';
    stateTimer = 0;
    frameCounter = 0;
}

function resetGame() {
    levelIndex = 0;
    player = null;
    parseLevel(levelIndex);
    player.score = 0;
    player.coins = 0;
    player.lives = 3;
    player.resetToSpawn();
    state = 'playing';
    stateTimer = 0;
    frameCounter = 0;
}

function gameLoop() {
    updateGame();
    drawGame();
    requestAnimationFrame(gameLoop);
}

function startGame() {
    parseLevel(levelIndex);
    state = 'playing';
    stateTimer = 0;
    frameCounter = 0;
}

document.addEventListener('keydown', (e) => {
    if (['ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        e.preventDefault();
    }
    keys[e.code] = true;
    if (e.code === 'Enter') {
        if (state === 'title') {
            startGame();
        } else if (state === 'gameOver') {
            resetGame();
        } else if (state === 'levelComplete') {
            advanceLevel();
        } else if (state === 'victory') {
            resetGame();
            state = 'title';
        }
    }
});

document.addEventListener('keyup', (e) => {
    if (['ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        e.preventDefault();
    }
    keys[e.code] = false;
});

startGame();
state = 'title';
gameLoop();
