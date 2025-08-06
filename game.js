const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const TILE = 16;

const LEVELS = [
    [
        '................................................................',
        '................................................................',
        '................................................................',
        '................................................................',
        '................................................................',
        '................................................................',
        '................................................................',
        '................................................................',
        '............................c...................................',
        '...................bbb..........................................',
        '..............................................g.................',
        '..........c....................................................F',
        'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    ],
    [
        '................................................................',
        '................................................................',
        '................................................................',
        '............................c...................................',
        '................bbbbbb..........................................',
        '................................................................',
        '............................................g...................',
        '....................c...........................................',
        '................................................................',
        '...............................bbb..............................',
        '................................................................',
        '..............c................................................F',
        'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    ],
    [
        '................................................................',
        '................................................................',
        '..........ccccc.................................................',
        '................................................................',
        '.........................bbbb...................................',
        '..............................g.................................',
        '................................................................',
        '.....c............................................c.............',
        '................................................................',
        '................................................................',
        '........................................bbbbb...................',
        '............................................................F...',
        'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    ]
];

let currentLevel = 0;
let LEVEL = LEVELS[currentLevel];

const COLORS = {
    ground: '#654321',
    brick: '#cc0000',
    coin: '#ffd700',
    player: '#ff0000',
    enemy: '#00cc00',
    flag: '#ffffff'
};

const GRAVITY = 0.5;
const FRICTION = 0.9;

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
        this.score = 0;
    }
    update(keys) {
        if (keys.ArrowLeft) this.dx = -2;
        else if (keys.ArrowRight) this.dx = 2;
        else this.dx *= FRICTION;

        if (keys.Space && this.onGround) {
            this.dy = -8;
            this.onGround = false;
        }

        if (!this.onGround) {
            this.dy += GRAVITY;
        } else {
            this.dy = 0;
        }

        this.x += this.dx;
        this.y += this.dy;
    }
    draw(offsetX) {
        ctx.fillStyle = COLORS.player;
        ctx.fillRect(Math.floor(this.x - offsetX), Math.floor(this.y), this.w, this.h);
    }
}

class Enemy extends Entity {
    constructor(x, y) {
        super(x, y, TILE, TILE);
        this.dx = -1;
    }
    update() {
        this.dy += GRAVITY;
        this.x += this.dx;
        this.y += this.dy;
    }
    draw(offsetX) {
        if (!this.alive) return;
        ctx.fillStyle = COLORS.enemy;
        ctx.fillRect(Math.floor(this.x - offsetX), Math.floor(this.y), this.w, this.h);
    }
}

let player;
let enemies = [];
let coins = [];
let flag = null;
let keys = {};
let gameState = 'playing'; // 'playing', 'win', 'lose'

function loadLevel(index) {
    currentLevel = index;
    LEVEL = LEVELS[currentLevel];
    enemies = [];
    coins = [];
    flag = null;
    for (let y = 0; y < LEVEL.length; y++) {
        for (let x = 0; x < LEVEL[y].length; x++) {
            const ch = LEVEL[y][x];
            const worldX = x * TILE;
            const worldY = y * TILE;
            if (ch === 'g') {
                enemies.push(new Enemy(worldX, worldY - TILE));
            } else if (ch === 'c') {
                coins.push({ x: worldX, y: worldY - TILE, w: TILE / 2, h: TILE / 2, collected: false });
            } else if (ch === 'F') {
                flag = { x: worldX, y: worldY - TILE * 2, w: TILE / 2, h: TILE * 2 };
            }
        }
    }
    player.x = 2 * TILE;
    player.y = 10 * TILE;
    player.dx = player.dy = 0;
    gameState = 'playing';
}

function init() {
    player = new Player(2 * TILE, 10 * TILE);
    loadLevel(0);
    window.requestAnimationFrame(gameLoop);
}

document.addEventListener('keydown', e => keys[e.code] = true);
document.addEventListener('keyup', e => keys[e.code] = false);

function collision(a, b) {
    return a.right > b.left && a.left < b.right && a.bottom > b.top && a.top < b.bottom;
}

function tileAt(x, y) {
    const tx = Math.floor(x / TILE);
    const ty = Math.floor(y / TILE);
    if (ty < 0 || ty >= LEVEL.length || tx < 0 || tx >= LEVEL[ty].length) return ' ';
    return LEVEL[ty][tx];
}

function resolveCollisions(entity) {
    if (!entity.alive) return;

    entity.onGround = false;

    // Check for collisions and resolve them
    const checkTiles = (x, y) => {
        const tile = tileAt(x, y);
        return tile !== '.' && tile !== 'c' && tile !== 'g' && tile !== 'F' && tile !== ' ';
    };

    // Vertical collision
    const verticalTiles = Math.ceil(entity.w / TILE);
    for (let i = 0; i < verticalTiles; i++) {
        const checkX = entity.left + i * TILE;
        if (entity.dy > 0) { // Moving down
            if (checkTiles(checkX, entity.bottom)) {
                entity.y = Math.floor(entity.bottom / TILE) * TILE - entity.h;
                entity.dy = 0;
                entity.onGround = true;
            }
        } else if (entity.dy < 0) { // Moving up
            if (checkTiles(checkX, entity.top)) {
                entity.y = Math.floor(entity.top / TILE + 1) * TILE;
                entity.dy = 0;
            }
        }
    }


    // Horizontal collision
    const horizontalTiles = Math.ceil(entity.h / TILE);
    for (let i = 0; i < horizontalTiles; i++) {
        const checkY = entity.top + i * TILE;
        if (entity.dx > 0) { // Moving right
            if (checkTiles(entity.right, checkY)) {
                entity.x = Math.floor(entity.right / TILE) * TILE - entity.w;
                entity.dx = 0;
                if(entity instanceof Enemy) entity.dx = -1;
            }
        } else if (entity.dx < 0) { // Moving left
            if (checkTiles(entity.left, checkY)) {
                entity.x = Math.floor(entity.left / TILE + 1) * TILE;
                entity.dx = 0;
                if(entity instanceof Enemy) entity.dx = 1;

            }
        }
    }
}

function gameLoop() {
    if (gameState !== 'playing') {
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#fff';
        ctx.font = '32px monospace';
        ctx.textAlign = 'center';
        if (gameState === 'win') {
            ctx.fillText('You Win!', canvas.width / 2, canvas.height / 2 - 20);
            ctx.font = '16px monospace';
            ctx.fillText('Score: ' + player.score, canvas.width / 2, canvas.height / 2 + 20);
        } else { // lose
            ctx.fillText('Game Over', canvas.width / 2, canvas.height / 2 - 20);
            ctx.font = '16px monospace';
            ctx.fillText('Press R to restart', canvas.width/2, canvas.height/2 + 20);
            if(keys['KeyR']) {
                init();
            }
        }
        window.requestAnimationFrame(gameLoop);
        return;
    }


    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const cameraX = Math.max(0, player.x - canvas.width / 2);

    // draw level
    for (let y = 0; y < LEVEL.length; y++) {
        for (let x = 0; x < LEVEL[y].length; x++) {
            const tile = LEVEL[y][x];
            const drawX = x * TILE - cameraX;
            const drawY = y * TILE;
            if (tile === 'b') {
                ctx.fillStyle = COLORS.brick;
                ctx.fillRect(drawX, drawY, TILE, TILE);
            } else if (tile === ' ' || tile === '.' || tile === 'g' || tile === 'c' || tile === 'F') {
                // skip, handled separately
            } else {
                ctx.fillStyle = COLORS.ground;
                ctx.fillRect(drawX, drawY, TILE, TILE);
            }
        }
    }

    // update and draw coins
    for (const coin of coins) {
        if (!coin.collected && collision(player, coin)) {
            coin.collected = true;
            player.score += 1;
        }
        if (!coin.collected) {
            ctx.fillStyle = COLORS.coin;
            ctx.fillRect(coin.x - cameraX, coin.y, coin.w, coin.h);
        }
    }

    // update enemies
    for (const enemy of enemies) {
        if (!enemy.alive) continue;
        enemy.update();
        resolveCollisions(enemy);
        if (collision(player, enemy)) {
            if (player.dy > 0 && player.bottom < enemy.y + enemy.h / 2) {
                enemy.alive = false;
                player.dy = -5;
                player.score += 5;
            } else {
                gameState = 'lose';
            }
        }
        enemy.draw(cameraX);
    }

    // draw flag
    if (flag) {
        ctx.fillStyle = COLORS.flag;
        ctx.fillRect(flag.x - cameraX, flag.y, flag.w, flag.h);
        if (collision(player, flag)) {
            if (currentLevel < LEVELS.length - 1) {
                loadLevel(currentLevel + 1);
            } else {
                gameState = 'win';
            }
        }
    }

    // update player
    player.update(keys);
    resolveCollisions(player);
    player.draw(cameraX);

    // draw score
    ctx.fillStyle = '#fff';
    ctx.font = '16px monospace';
    ctx.fillText('Score: ' + player.score, 10, 20);

    window.requestAnimationFrame(gameLoop);
}

init();
