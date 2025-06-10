const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const TILE = 16;

const LEVEL = [
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
    'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
];

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
        super(x, y, TILE, TILE*1.5);
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
        ctx.fillStyle = COLORS.enemy;
        ctx.fillRect(Math.floor(this.x - offsetX), Math.floor(this.y), this.w, this.h);
    }
}

let player;
let enemies = [];
let coins = [];
let flag = null;
let keys = {};

function init() {
    for (let y=0;y<LEVEL.length;y++) {
        for (let x=0;x<LEVEL[y].length;x++) {
            const ch = LEVEL[y][x];
            const worldX = x*TILE;
            const worldY = y*TILE;
            if (ch === 'g') {
                enemies.push(new Enemy(worldX, worldY - TILE));
            } else if (ch === 'c') {
                coins.push({x: worldX, y: worldY - TILE, w:TILE/2, h:TILE/2, collected:false});
            } else if (ch === 'F') {
                flag = {x: worldX, y: worldY - TILE*2, w:TILE/2, h:TILE*2};
            }
        }
    }
    player = new Player(2*TILE, 10*TILE);
    window.requestAnimationFrame(gameLoop);
}

document.addEventListener('keydown', e => keys[e.code] = true);
document.addEventListener('keyup', e => keys[e.code] = false);

function collision(a, b) {
    return a.right > b.left && a.left < b.right && a.bottom > b.top && a.top < b.bottom;
}

function tileAt(x,y) {
    const tx = Math.floor(x / TILE);
    const ty = Math.floor(y / TILE);
    if (ty < 0 || ty >= LEVEL.length || tx < 0 || tx >= LEVEL[ty].length) return ' ';
    return LEVEL[ty][tx];
}

function resolveCollisions(entity) {
    if (!entity.alive) return;
    const aheadX = entity.dx > 0 ? entity.right : entity.left;
    const aheadY = entity.dy > 0 ? entity.bottom : entity.top;

    const tx = Math.floor(aheadX / TILE);
    const ty = Math.floor(aheadY / TILE);

    for (let y = ty - 1; y <= ty + 1; y++) {
        for (let x = tx - 1; x <= tx + 1; x++) {
            const tile = tileAt(x*TILE, y*TILE);
            if (tile === '.' || tile === 'c' || tile === 'g' || tile === 'F') continue;
            const rect = {x:x*TILE, y:y*TILE, w:TILE, h:TILE};
            if (collision(entity, rect)) {
                if (entity.dy > 0 && entity.bottom > rect.top && entity.top < rect.top) {
                    entity.y = rect.top - entity.h;
                    entity.dy = 0;
                    entity.onGround = true;
                } else if (entity.dy < 0 && entity.top < rect.bottom && entity.bottom > rect.bottom) {
                    entity.y = rect.bottom;
                    entity.dy = 0;
                } else if (entity.dx > 0 && entity.right > rect.left && entity.left < rect.left) {
                    entity.x = rect.left - entity.w;
                    entity.dx = 0;
                } else if (entity.dx < 0 && entity.left < rect.right && entity.right > rect.right) {
                    entity.x = rect.right;
                    entity.dx = 0;
                }
            }
        }
    }
}

function gameLoop() {
    ctx.clearRect(0,0,canvas.width,canvas.height);
    const cameraX = Math.max(0, player.x - canvas.width/2);

    // draw level
    for (let y=0;y<LEVEL.length;y++) {
        for (let x=0;x<LEVEL[y].length;x++) {
            const tile = LEVEL[y][x];
            const drawX = x*TILE - cameraX;
            const drawY = y*TILE;
            if (tile === 'b') {
                ctx.fillStyle = COLORS.brick;
                ctx.fillRect(drawX, drawY, TILE, TILE);
            } else if (tile === ' ') {
                // skip
            } else if (tile === '.') {
                // skip
            } else if (tile === 'g' || tile === 'c' || tile === 'F') {
                // handled separately
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
            if (player.dy > 0 && player.bottom < enemy.y + enemy.h/2) {
                enemy.alive = false;
                player.dy = -5;
                player.score += 5;
            } else {
                // reset
                player.x = 2*TILE;
                player.y = 10*TILE;
                player.dx = player.dy = 0;
            }
        }
        enemy.draw(cameraX);
    }

    // draw flag
    if (flag) {
        ctx.fillStyle = COLORS.flag;
        ctx.fillRect(flag.x - cameraX, flag.y, flag.w, flag.h);
        if (collision(player, flag)) {
            alert('You win! Score: '+player.score);
            window.location.reload();
            return;
        }
    }

    // update player
    player.update(keys);
    resolveCollisions(player);
    player.draw(cameraX);

    // draw score
    ctx.fillStyle = '#fff';
    ctx.font = '16px monospace';
    ctx.fillText('Score: '+player.score, 10, 20);

    window.requestAnimationFrame(gameLoop);
}

init();
