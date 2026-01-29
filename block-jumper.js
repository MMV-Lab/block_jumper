// Canvas setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = 800;
canvas.height = 400;

// Game state
let gameState = 'start'; // 'start', 'playing', 'gameOver'
let score = 0;
let lives = 3;
let level = 1;
let cameraX = 0;
let canJump = true;
let invulnerable = false;
let invulnerableTimer = 0;
let lastLifeBonusScore = 0; // Track last score that gave a life bonus
let jumpButtonHeld = false; // Track if jump button was held last frame
let chargedJumpUsed = false; // One mid-air jump per time in air
let skipAirJumpThisFrame = false; // Don't air-jump same frame as ground jump (so hold = double jump)
const MID_AIR_JUMP_COOLDOWN = 12.5; // seconds
let midAirJumpCooldownRemaining = 0;

// Level timer (seconds)
const MAX_LEVEL_TIME = 100;
let levelTime = MAX_LEVEL_TIME;

// Level length (player x position to reach to complete level)
const LEVEL_END = 12000;

// Characters (selectable in menu)
const CHARACTERS = [
    { name: 'Blox', color: '#FF0000', hatColor: '#8B0000' },
    { name: 'Verd', color: '#32CD32', hatColor: '#006400' },
    { name: 'Amber', color: '#FFD700', hatColor: '#B8860B' }
];
let selectedCharacterIndex = 0;

// Player
const player = {
    x: 50,
    y: 300,
    width: 30,
    height: 40,
    speedX: 0,
    speedY: 0,
    onGround: false,
    facingRight: true,
    color: '#FF0000',
    hatColor: '#8B0000'
};

// Physics constants
const GRAVITY = 0.8;
const ENEMY_GRAVITY = 0.6;
const JUMP_STRENGTH = -15;
const MAX_SPEED = 5;
const FRICTION = 0.8;
const INVULNERABLE_TIME = 120; // frames

// Level 1 platforms (fixed layout)
const LEVEL_1_PLATFORMS = [
    { x: 0, y: 350, width: 200, height: 50 },
    { x: 250, y: 320, width: 150, height: 50 },
    { x: 450, y: 280, width: 150, height: 50 },
    { x: 650, y: 240, width: 150, height: 50 },
    { x: 850, y: 200, width: 150, height: 50 },
    { x: 1050, y: 280, width: 150, height: 50 },
    { x: 1250, y: 320, width: 150, height: 50 },
    { x: 1450, y: 350, width: 300, height: 50 },
    { x: 1800, y: 300, width: 200, height: 50, speedX: 1.2, minX: 1750, maxX: 2050 },
    { x: 2100, y: 250, width: 200, height: 50, speedX: -1.0, minX: 2000, maxX: 2350 },
    { x: 2400, y: 350, width: 200, height: 50 },
    { x: 2700, y: 300, width: 150, height: 50, speedX: 1.5, minX: 2650, maxX: 2950 },
    { x: 2950, y: 250, width: 150, height: 50 },
    { x: 3200, y: 200, width: 150, height: 50 },
    { x: 3450, y: 280, width: 150, height: 50, speedX: -1.3, minX: 3350, maxX: 3600 },
    { x: 3700, y: 320, width: 200, height: 50 },
    { x: 4000, y: 350, width: 300, height: 50 },
    { x: 4400, y: 300, width: 200, height: 50 },
    { x: 4700, y: 250, width: 200, height: 50, speedX: 1.0, minX: 4650, maxX: 4950 },
    { x: 5000, y: 200, width: 150, height: 50 },
    { x: 5250, y: 280, width: 150, height: 50 },
    { x: 5500, y: 320, width: 200, height: 50, speedX: -1.2, minX: 5450, maxX: 5750 },
    { x: 5800, y: 350, width: 400, height: 50 },
    { x: 6300, y: 300, width: 200, height: 50 },
    { x: 6600, y: 250, width: 200, height: 50 },
    { x: 6900, y: 200, width: 150, height: 50 },
    { x: 7150, y: 280, width: 150, height: 50, speedX: 1.4, minX: 7100, maxX: 7400 },
    { x: 7400, y: 320, width: 200, height: 50 },
    { x: 7700, y: 350, width: 500, height: 50 },
    { x: 8300, y: 300, width: 200, height: 50 },
    { x: 8600, y: 250, width: 150, height: 50, speedY: 0.8, minY: 200, maxY: 300 },
    { x: 8900, y: 280, width: 200, height: 50 },
    { x: 9200, y: 320, width: 150, height: 50, speedX: 1.2, minX: 9150, maxX: 9450 },
    { x: 9500, y: 200, width: 200, height: 50, speedY: -0.7, minY: 150, maxY: 250 },
    { x: 9800, y: 350, width: 300, height: 50 },
    { x: 10200, y: 280, width: 200, height: 50 },
    { x: 10500, y: 240, width: 150, height: 50, speedY: 0.9, minY: 200, maxY: 320 },
    { x: 10800, y: 300, width: 200, height: 50 },
    { x: 11100, y: 250, width: 200, height: 50, speedX: -1.3, minX: 10900, maxX: 11400 },
    { x: 11400, y: 350, width: 400, height: 50 }
];

// Current level platforms (level 1 copy or randomly generated for level 2+)
let platforms = [];

// --- Random level generation (level 2+) ---
// Max vertical step between platforms so every platform is jump-reachable (~90px jump height)
const MAX_PLATFORM_VERTICAL_STEP = 90;
function generateRandomPlatforms() {
    const list = [];
    const minGap = 50;
    const maxGap = 130;
    let x = 0;
    let y = 320;
    const minY = 160;
    const maxY = 350;
    while (x < LEVEL_END) {
        const width = 140 + Math.floor(Math.random() * 140);
        const gap = minGap + Math.random() * (maxGap - minGap);
        const verticalStep = (Math.random() - 0.5) * 2 * MAX_PLATFORM_VERTICAL_STEP;
        y = Math.max(minY, Math.min(maxY, y + verticalStep));
        const platform = { x, y, width, height: 50 };
        if (Math.random() < 0.18) {
            const range = 60 + Math.random() * 100;
            platform.speedX = (Math.random() > 0.5 ? 1 : -1) * (0.7 + Math.random() * 0.7);
            platform.minX = platform.x;
            platform.maxX = platform.x + range;
        } else if (Math.random() < 0.14) {
            const range = 50 + Math.random() * 60;
            platform.speedY = (Math.random() > 0.5 ? 1 : -1) * (0.5 + Math.random() * 0.5);
            platform.minY = Math.max(minY, platform.y - range / 2);
            platform.maxY = Math.min(maxY, platform.y + range / 2);
        }
        list.push(platform);
        x += width + gap;
    }
    if (list.length) {
        const last = list[list.length - 1];
        if (last.x + last.width < LEVEL_END) {
            last.width = LEVEL_END - last.x + 100;
        }
    }
    return list;
}

function generateRandomCoins(platforms) {
    const coins = [];
    const bigCount = 7;
    const smallCount = 25 + Math.floor(Math.random() * 15);
    const platformCoins = platforms.filter(p => p.width >= 100);
    for (let i = 0; i < bigCount && platformCoins.length; i++) {
        const p = platformCoins[Math.floor(Math.random() * platformCoins.length)];
        coins.push({
            x: p.x + 20 + Math.random() * (p.width - 52),
            y: p.y - 80 - Math.random() * 60,
            width: 32,
            height: 32,
            collected: false,
            points: 125
        });
    }
    for (let i = 0; i < smallCount; i++) {
        const p = platforms[Math.floor(Math.random() * platforms.length)];
        const margin = 30;
        const cx = p.x + margin + Math.random() * (p.width - margin * 2 - 20);
        const cy = p.y - 40 - Math.random() * 80;
        coins.push({
            x: cx,
            y: cy,
            width: 20,
            height: 20,
            collected: false,
            points: 50
        });
    }
    return coins;
}

function generateRandomEnemies(platforms) {
    const enemies = [];
    const types = ['walker', 'walker', 'jumper', 'tank'];
    for (let i = 0; i < platforms.length; i++) {
        const platform = platforms[i];
        const isEverySecond = (i % 2) === 0;
        const count = isEverySecond ? (1 + (Math.random() < 0.4 ? 1 : 0)) : (Math.random() < 0.35 ? 1 : 0);
        for (let k = 0; k < count; k++) {
            const type = types[Math.floor(Math.random() * types.length)];
            const w = type === 'tank' ? 34 : 30;
            const h = type === 'tank' ? 34 : 30;
            const space = Math.max(0, platform.width - w - 20);
            const ex = platform.x + 10 + (space ? Math.random() * space : 0);
            const enemy = {
                x: ex,
                y: platform.y - h,
                width: w,
                height: h,
                speedX: type === 'tank' ? (Math.random() > 0.5 ? -1.5 : 1.5) : (Math.random() > 0.5 ? -2 : 2),
                color: type === 'tank' ? '#5A3A1E' : (type === 'jumper' ? '#0066FF' : '#8B0000'),
                type
            };
            if (type === 'tank') enemy.hp = 2;
            enemies.push(enemy);
        }
    }
    return enemies;
}

// Enemies (will be reset on game start)
let enemies = [];

// Coins (will be reset on game start)
let coins = [];

// Input handling
const keys = {};

document.addEventListener('keydown', (e) => {
    keys[e.key] = true;
    if (e.key === ' ' || e.key === 'ArrowUp') {
        e.preventDefault();
    }
});

document.addEventListener('keyup', (e) => {
    keys[e.key] = false;
});

// Collision detection
function checkCollision(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
}

// Update player
function updatePlayer() {
    // Horizontal movement
    if (keys['ArrowLeft'] || keys['a'] || keys['A']) {
        player.speedX = Math.max(player.speedX - 0.5, -MAX_SPEED);
        player.facingRight = false;
    } else if (keys['ArrowRight'] || keys['d'] || keys['D']) {
        player.speedX = Math.min(player.speedX + 0.5, MAX_SPEED);
        player.facingRight = true;
    } else {
        player.speedX *= FRICTION;
    }

    // Check if jump button is pressed
    const jumpPressed = keys[' '] || keys['ArrowUp'] || keys['w'] || keys['W'];

    // Normal jump (on ground)
    if (jumpPressed && player.onGround && canJump) {
        player.speedY = JUMP_STRENGTH;
        player.onGround = false;
        canJump = false;
        jumpButtonHeld = true;
        chargedJumpUsed = false;
        skipAirJumpThisFrame = true; // Don't trigger air jump same frame (so hold = double jump next frame)
    }

    // Mid-air jump cooldown tick
    midAirJumpCooldownRemaining -= 1 / 60;
    if (midAirJumpCooldownRemaining < 0) midAirJumpCooldownRemaining = 0;

    // Mid-air jump: only N or M while in air (one per air time, 12.5s cooldown)
    const midAirJumpPressed = keys['n'] || keys['N'] || keys['m'] || keys['M'];
    if (midAirJumpPressed && !player.onGround && !chargedJumpUsed && !skipAirJumpThisFrame && midAirJumpCooldownRemaining <= 0) {
        player.speedY = JUMP_STRENGTH;
        chargedJumpUsed = true;
        jumpButtonHeld = true;
        midAirJumpCooldownRemaining = MID_AIR_JUMP_COOLDOWN;
    }

    // Variable jump height - if player releases jump button while moving up, reduce jump height
    if (jumpButtonHeld && !jumpPressed && player.speedY < 0) {
        player.speedY *= 0.4; // Cut jump velocity significantly when released early
    }

    // Update jump button held state
    if (jumpPressed) {
        jumpButtonHeld = true;
    } else {
        jumpButtonHeld = false;
        canJump = true;
    }

    // Apply gravity
    player.speedY += GRAVITY;

    // Update position
    const oldX = player.x;
    const oldY = player.y;
    player.x += player.speedX;
    player.y += player.speedY;

    // Check platform collisions
    player.onGround = false;
    for (let platform of platforms) {
        if (checkCollision(player, platform)) {
            // Calculate overlap
            const overlapLeft = (player.x + player.width) - platform.x;
            const overlapRight = (platform.x + platform.width) - player.x;
            const overlapTop = (player.y + player.height) - platform.y;
            const overlapBottom = (platform.y + platform.height) - player.y;
            
            // Find minimum overlap
            const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);
            
            // Landing on top of platform
            if (minOverlap === overlapTop && player.speedY >= 0) {
                player.y = platform.y - player.height;
                player.speedY = 0;
                player.onGround = true;
                jumpButtonHeld = false;
                chargedJumpUsed = false; // Allow charged jump again after landing
            }
            // Hitting platform from below
            else if (minOverlap === overlapBottom && player.speedY < 0) {
                player.y = platform.y + platform.height;
                player.speedY = 0;
            }
            // Side collisions
            else if (minOverlap === overlapLeft && player.speedX > 0) {
                player.x = platform.x - player.width;
                player.speedX = 0;
            } else if (minOverlap === overlapRight && player.speedX < 0) {
                player.x = platform.x + platform.width;
                player.speedX = 0;
            }
        }
    }

    // Check if player fell out of the world (below the canvas)
    // Player can fall freely - no vertical bounds restriction
    const deathY = canvas.height + 100; // Death zone below canvas
    
    if (player.y > deathY) {
        // Player fell out of the world - take damage (only once per fall)
        if (!invulnerable && gameState === 'playing') {
            takeDamage();
            respawnOnNearestPlatform();
        }
    }

    // Update camera to follow player
    cameraX = player.x - canvas.width / 3;
    if (cameraX < 0) cameraX = 0;
    
    // Update invulnerability
    if (invulnerable) {
        invulnerableTimer--;
        if (invulnerableTimer <= 0) {
            invulnerable = false;
        }
    }

    skipAirJumpThisFrame = false; // Reset for next frame
}

// Respawn player safely on the nearest platform to their current X position
function respawnOnNearestPlatform() {
    if (gameState !== 'playing' || lives <= 0) return;

    // Use player center X to find nearest platform behind or under them
    const playerCenterX = player.x + player.width / 2;
    let bestPlatform = null;
    let bestDistance = Infinity;

    for (const platform of platforms) {
        const platformCenterX = platform.x + platform.width / 2;
        // Prefer platforms that are not far ahead (slightly behind or under the player)
        const dx = playerCenterX - platformCenterX;
        if (dx >= -200) { // allow a bit in front, mainly behind
            const distance = Math.abs(dx);
            if (distance < bestDistance) {
                bestDistance = distance;
                bestPlatform = platform;
            }
        }
    }

    // Fallback to first platform if none found
    if (!bestPlatform) {
        bestPlatform = platforms[0];
    }

    player.x = bestPlatform.x + bestPlatform.width / 2 - player.width / 2;
    player.y = bestPlatform.y - player.height;
    player.speedX = 0;
    player.speedY = 0;
    player.onGround = true;
    jumpButtonHeld = false;
    chargedJumpUsed = false;

    cameraX = Math.max(0, player.x - canvas.width / 3);
}

// Update moving platforms
function updatePlatforms() {
    for (const platform of platforms) {
        // Horizontal movement
        if (typeof platform.speedX === 'number') {
            platform.x += platform.speedX;
            // Reverse at bounds
            if (platform.x < platform.minX || platform.x + platform.width > platform.maxX) {
                platform.speedX *= -1;
                // Clamp inside range
                if (platform.x < platform.minX) platform.x = platform.minX;
                if (platform.x + platform.width > platform.maxX) {
                    platform.x = platform.maxX - platform.width;
                }
            }
        }
        // Vertical movement
        if (typeof platform.speedY === 'number') {
            platform.y += platform.speedY;
            // Reverse at bounds
            if (platform.y < platform.minY || platform.y > platform.maxY) {
                platform.speedY *= -1;
                // Clamp inside range
                if (platform.y < platform.minY) platform.y = platform.minY;
                if (platform.y > platform.maxY) platform.y = platform.maxY;
            }
        }
    }
}

// Update enemies
const ENEMY_DEATH_Y = 500; // Below this Y, enemies are removed (level 2+)
function updateEnemies() {
    // Iterate backwards to safely remove enemies
    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];

        // Level 2+: enemies that fall off the world die
        if (level >= 2 && enemy.y > ENEMY_DEATH_Y) {
            enemies.splice(i, 1);
            continue;
        }

        // Apply gravity and vertical motion for jumpers
        if (enemy.type === 'jumper') {
            if (typeof enemy.speedY !== 'number') enemy.speedY = 0;
            if (typeof enemy.jumpTimer !== 'number') enemy.jumpTimer = 120; // ~2 seconds at 60fps

            enemy.jumpTimer--;
            if (enemy.jumpTimer <= 0 && enemy.onPlatform) {
                enemy.speedY = -8; // higher hop for blue jumpers
                enemy.jumpTimer = 120;
            }

            enemy.speedY += ENEMY_GRAVITY;
            enemy.y += enemy.speedY;
        }

        // Basic horizontal movement
        enemy.x += enemy.speedX;

        // Find platform enemy is on
        let onPlatform = false;
        let currentPlatform = null;
        const tolerance = 5;
        const landTolerance = enemy.type === 'jumper' ? 14 : 5; // jumpers need bigger range when falling so they don't fall through
        for (let platform of platforms) {
            const vertDist = Math.abs((enemy.y + enemy.height) - platform.y);
            if (enemy.x + enemy.width >= platform.x &&
                enemy.x <= platform.x + platform.width &&
                vertDist < landTolerance) {
                onPlatform = true;
                currentPlatform = platform;
                // For jumpers: only snap to platform when landing (moving down). When speedY < 0 we're jumping - don't cancel it
                const jumperMovingUp = enemy.type === 'jumper' && (enemy.speedY || 0) < 0;
                if (!jumperMovingUp) {
                    enemy.y = platform.y - enemy.height;
                    if (enemy.type === 'jumper') {
                        enemy.speedY = 0;
                    }
                }
                
                // Reverse direction at platform edges
                if (enemy.x <= platform.x + 5) {
                    enemy.speedX = Math.abs(enemy.speedX); // Move right
                    enemy.x = platform.x + 5;
                } else if (enemy.x + enemy.width >= platform.x + platform.width - 5) {
                    enemy.speedX = -Math.abs(enemy.speedX); // Move left
                    enemy.x = platform.x + platform.width - enemy.width - 5;
                }
                break;
            }
        }
        enemy.onPlatform = onPlatform;

        // Level 2+: in-air enemies fall (gravity) and die if they fall off; no teleport to ground
        if (level >= 2 && !onPlatform) {
            if (enemy.type !== 'jumper') {
                if (typeof enemy.speedY !== 'number') enemy.speedY = 0;
                enemy.speedY += ENEMY_GRAVITY;
                enemy.y += enemy.speedY;
            }
            // Death check is at top of loop; no ground teleport
        } else if (!onPlatform && enemy.type !== 'jumper') {
            // Level 1: original behaviour – reverse and try to find platform below
            enemy.speedX *= -1;
            let foundPlatform = false;
            for (let platform of platforms) {
                if (enemy.x + enemy.width >= platform.x &&
                    enemy.x <= platform.x + platform.width &&
                    enemy.y < platform.y &&
                    enemy.y + enemy.height < platform.y + 20) {
                    enemy.y = platform.y - enemy.height;
                    foundPlatform = true;
                    break;
                }
            }
            if (!foundPlatform && enemy.y + enemy.height < canvas.height - 50) {
                enemy.y = canvas.height - 50 - enemy.height;
            }
        }

        // Check collision with player (only if not invulnerable)
        const type = enemy.type || 'walker';
        const stompZone = type === 'tank' ? enemy.height * 0.65 : enemy.height / 2; // Tank: more forgiving stomp zone
        const isStomp = player.speedY > 0 && player.y + player.height < enemy.y + stompZone;
        const tankInner = type === 'tank' && { x: enemy.x + 4, y: enemy.y + 4, width: enemy.width - 8, height: enemy.height - 8 };
        const playerHitsTankInner = tankInner ? checkCollision(player, tankInner) : checkCollision(player, enemy);

        if (!invulnerable && checkCollision(player, enemy)) {
            if (isStomp) {
                // Player jumps on enemy (stomp)
                if (type === 'tank') {
                    enemy.hp = (enemy.hp || 2) - 1;
                    player.speedY = -8; // Bounce on stomp
                    if (enemy.hp <= 0) {
                        enemies.splice(i, 1);
                        score += 150;
                    } else {
                        score += 50;
                    }
                } else {
                    enemies.splice(i, 1);
                    player.speedY = -8;
                    score += type === 'jumper' ? 120 : 100;
                }
                document.getElementById('score').textContent = score;
                checkLifeBonus();
            } else {
                // Player hit by enemy; tank only damages when player overlaps inner hitbox (so stomping from edge works)
                if (type !== 'tank' || playerHitsTankInner) {
                    takeDamage();
                    break;
                }
            }
        }
    }
}

// Check for life bonus
function checkLifeBonus() {
    // Give a life every 1000 points
    const currentBonusLevel = Math.floor(score / 1000);
    const lastBonusLevel = Math.floor(lastLifeBonusScore / 1000);
    
    if (currentBonusLevel > lastBonusLevel && currentBonusLevel > 0) {
        lives++;
        lastLifeBonusScore = score;
        document.getElementById('lives').textContent = lives;
    }
}

// Update coins
function updateCoins() {
    for (let coin of coins) {
        if (!coin.collected && checkCollision(player, coin)) {
            coin.collected = true;
            score += coin.points || 50;
            document.getElementById('score').textContent = score;
            checkLifeBonus();
        }
    }
}

// Take damage
function takeDamage() {
    if (invulnerable) return; // Already invulnerable
    
    lives--;
    document.getElementById('lives').textContent = lives;
    
    // Make player invulnerable
    invulnerable = true;
    invulnerableTimer = INVULNERABLE_TIME;
    
    // Small knockback
    player.speedX = player.facingRight ? -3 : 3;
    player.speedY = -5;

    if (lives <= 0) {
        gameOver();
    }
}

// Game over
function gameOver() {
    gameState = 'gameOver';
    document.getElementById('finalScore').textContent = score;
    document.getElementById('gameOver').classList.remove('hidden');
}

// Draw functions
function drawPlayer() {
    ctx.save();
    ctx.translate(-cameraX, 0);
    
    // Flash effect when invulnerable
    if (invulnerable && Math.floor(invulnerableTimer / 5) % 2 === 0) {
        ctx.globalAlpha = 0.5;
    }
    
    // Draw player body
    ctx.fillStyle = player.color;
    ctx.fillRect(player.x, player.y, player.width, player.height);
    
    // Draw face
    ctx.fillStyle = '#000';
    ctx.fillRect(player.x + 8, player.y + 10, 5, 5); // Left eye
    ctx.fillRect(player.x + 17, player.y + 10, 5, 5); // Right eye
    
    // Draw hat/cap
    ctx.fillStyle = player.hatColor || '#8B0000';
    ctx.fillRect(player.x, player.y, player.width, 10);
    
    ctx.globalAlpha = 1.0;
    ctx.restore();
}

function drawPlatforms() {
    ctx.save();
    ctx.translate(-cameraX, 0);
    
    const night = isNightLevel();
    for (let platform of platforms) {
        ctx.fillStyle = night ? '#3d2914' : '#8B4513';
        ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
        ctx.fillStyle = night ? '#1a3d1a' : '#228B22';
        ctx.fillRect(platform.x, platform.y, platform.width, 10);
        ctx.strokeStyle = night ? '#2a1f0f' : '#654321';
        ctx.lineWidth = 2;
        ctx.strokeRect(platform.x, platform.y, platform.width, platform.height);
    }
    
    ctx.restore();
}

function drawEnemies() {
    ctx.save();
    ctx.translate(-cameraX, 0);
    
    for (let enemy of enemies) {
        // Enemy body
        ctx.fillStyle = enemy.color;
        ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
        
        // Enemy eyes
        ctx.fillStyle = '#FFF';
        ctx.fillRect(enemy.x + 5, enemy.y + 8, 6, 6);
        ctx.fillRect(enemy.x + 19, enemy.y + 8, 6, 6);
        
        ctx.fillStyle = '#000';
        ctx.fillRect(enemy.x + 7, enemy.y + 10, 2, 2);
        ctx.fillRect(enemy.x + 21, enemy.y + 10, 2, 2);
    }
    
    ctx.restore();
}

function drawCoins() {
    ctx.save();
    ctx.translate(-cameraX, 0);
    
    const time = Date.now() * 0.01;
    
    for (let coin of coins) {
        if (!coin.collected) {
            const isBig = (coin.points || 50) === 125;
            ctx.save();
            ctx.translate(coin.x + coin.width / 2, coin.y + coin.height / 2);
            ctx.rotate(time);
            
            ctx.fillStyle = isBig ? '#FFA500' : '#FFD700';
            ctx.beginPath();
            ctx.ellipse(0, 0, coin.width / 2, coin.height / 2, 0, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.strokeStyle = isBig ? '#FF8C00' : '#FFA500';
            ctx.lineWidth = isBig ? 3 : 2;
            ctx.stroke();
            
            ctx.restore();
        }
    }
    
    ctx.restore();
}

// Night level: every second level from 2 (2, 4, 6, ...)
function isNightLevel() {
    return level >= 2 && level % 2 === 0;
}

function drawBackground() {
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    if (isNightLevel()) {
        gradient.addColorStop(0, '#0a0a1a');
        gradient.addColorStop(0.5, '#1a1a3a');
        gradient.addColorStop(1, '#0d0d2b');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        // Stars (parallax)
        ctx.save();
        ctx.translate(-cameraX * 0.2, 0);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        const starPositions = [100, 350, 600, 1100, 1400, 2000, 2600, 3200, 3800, 4400, 5000, 5600, 6200, 7000, 7600, 8400, 9000, 9600, 10400, 11200];
        for (const sx of starPositions) {
            const sy = 20 + (sx % 120);
            ctx.beginPath();
            ctx.arc(sx, sy, 1.5, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.fillStyle = 'rgba(255, 255, 220, 0.95)';
        for (let i = 0; i < 8; i++) {
            const sx = 500 + i * 1500 + (i * 137) % 400;
            const sy = 35 + (i * 23) % 60;
            ctx.beginPath();
            ctx.arc(sx, sy, 1, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
        // Moon
        const moonX = 600 - (cameraX * 0.15) % (canvas.width + 100);
        ctx.fillStyle = 'rgba(255, 252, 230, 0.95)';
        ctx.beginPath();
        ctx.arc(moonX, 55, 28, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(10, 10, 26, 0.4)';
        ctx.beginPath();
        ctx.arc(moonX + 8, 50, 10, 0, Math.PI * 2);
        ctx.fill();
        // Dark clouds
        ctx.save();
        ctx.translate(-cameraX * 0.25, 0);
        ctx.fillStyle = 'rgba(40, 40, 80, 0.5)';
        drawCloud(200, 70);
        drawCloud(900, 55);
        drawCloud(2500, 75);
        drawCloud(5000, 60);
        drawCloud(8000, 65);
        drawCloud(11000, 50);
        ctx.restore();
    } else {
        gradient.addColorStop(0, '#87CEEB');
        gradient.addColorStop(1, '#98D8E8');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.save();
        ctx.translate(-cameraX * 0.3, 0);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        drawCloud(100, 50);
        drawCloud(400, 80);
        drawCloud(700, 60);
        drawCloud(1200, 70);
        drawCloud(1800, 50);
        drawCloud(2200, 65);
        drawCloud(3000, 55);
        drawCloud(3500, 75);
        drawCloud(4200, 60);
        drawCloud(4800, 70);
        drawCloud(5500, 50);
        drawCloud(6200, 65);
        drawCloud(7000, 55);
        drawCloud(7500, 75);
        drawCloud(8500, 60);
        drawCloud(9200, 70);
        drawCloud(10000, 55);
        drawCloud(10800, 65);
        drawCloud(11500, 50);
        ctx.restore();
    }
}

function drawCloud(x, y) {
    ctx.beginPath();
    ctx.arc(x, y, 20, 0, Math.PI * 2);
    ctx.arc(x + 25, y, 25, 0, Math.PI * 2);
    ctx.arc(x + 50, y, 20, 0, Math.PI * 2);
    ctx.fill();
}

// Mid-air jump cooldown circle (fixed screen position, no camera)
function drawMidAirJumpCooldown() {
    const cx = canvas.width - 52;
    const cy = 52;
    const radius = 38;
    ctx.save();
    // Outline circle
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 3;
    ctx.stroke();
    // Cooldown fill: arc from top clockwise, shows remaining time
    if (midAirJumpCooldownRemaining > 0) {
        const ratio = midAirJumpCooldownRemaining / MID_AIR_JUMP_COOLDOWN;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, radius - 2, -Math.PI / 2, -Math.PI / 2 + ratio * Math.PI * 2, false);
        ctx.closePath();
        ctx.fillStyle = 'rgba(100, 180, 255, 0.5)';
        ctx.fill();
    }
    ctx.restore();
}

// Game loop
function gameLoop() {
    if (gameState === 'playing') {
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw background
        drawBackground();
        
        // Update level timer
        levelTime -= 1 / 60;
        if (levelTime < 0) levelTime = 0;
        const timeElement = document.getElementById('time');
        if (timeElement) {
            timeElement.textContent = Math.ceil(levelTime).toString();
        }

        // Update level progress bar
        const progressBar = document.getElementById('levelProgressBar');
        if (progressBar) {
            const progress = Math.min(100, (player.x / LEVEL_END) * 100);
            progressBar.style.width = progress + '%';
        }

        // If time runs out, the player loses a life and respawns
        if (levelTime <= 0 && !invulnerable) {
            takeDamage();
            respawnOnNearestPlatform();
            levelTime = MAX_LEVEL_TIME;
        }

        // Update game objects
        updatePlatforms();
        updatePlayer();
        updateEnemies();
        updateCoins();
        
        // Draw game objects
        drawPlatforms();
        drawCoins();
        drawEnemies();
        drawPlayer();
        drawMidAirJumpCooldown();
        
        // Check if player reached end
        if (player.x > LEVEL_END) {
            level++;
            document.getElementById('level').textContent = level;
            // Reset for next level
            player.x = 50;
            player.y = 300;
            player.speedX = 0;
            player.speedY = 0;
            cameraX = 0;
            invulnerable = false;
            invulnerableTimer = 0;
            levelTime = MAX_LEVEL_TIME;

            // Level 2+: randomly generated platforms, coins, enemies (every second platform has ≥1 enemy)
            if (level > 1) {
                platforms = generateRandomPlatforms();
                coins = generateRandomCoins(platforms);
                enemies = generateRandomEnemies(platforms);
            }
        }
        
        // Fall detection is now handled in updatePlayer()
    }
    
    requestAnimationFrame(gameLoop);
}

// Initialize game data
function initializeGameData() {
    // Level 1: use fixed platforms (copy so moving platforms get fresh state)
    platforms = LEVEL_1_PLATFORMS.map(p => ({ ...p }));

    // Initialize enemies on platforms (distributed across the longer level)
    enemies = [
        // Walkers
        { x: 300, y: 320 - 30, width: 30, height: 30, speedX: -2, color: '#8B0000', type: 'walker' },
        { x: 500, y: 280 - 30, width: 30, height: 30, speedX: -2, color: '#8B0000', type: 'walker' },
        { x: 700, y: 240 - 30, width: 30, height: 30, speedX: -2, color: '#8B0000', type: 'walker' },
        { x: 900, y: 200 - 30, width: 30, height: 30, speedX: -2, color: '#8B0000', type: 'walker' },
        // Jumpers (blue)
        { x: 1100, y: 280 - 30, width: 30, height: 30, speedX: -2, color: '#0066FF', type: 'jumper' },
        { x: 1300, y: 320 - 30, width: 30, height: 30, speedX: -2, color: '#0066FF', type: 'jumper' },
        // Tanks (brown)
        { x: 1850, y: 300 - 30, width: 34, height: 34, speedX: -1.5, color: '#5A3A1E', type: 'tank', hp: 2 },
        { x: 2150, y: 250 - 30, width: 34, height: 34, speedX: -1.5, color: '#5A3A1E', type: 'tank', hp: 2 },
        // Mix further along the level
        { x: 2450, y: 350 - 30, width: 30, height: 30, speedX: -2, color: '#8B0000', type: 'walker' },
        { x: 2750, y: 300 - 30, width: 30, height: 30, speedX: -2, color: '#0066FF', type: 'jumper' },
        { x: 3000, y: 250 - 30, width: 34, height: 34, speedX: -1.5, color: '#5A3A1E', type: 'tank', hp: 2 },
        { x: 3250, y: 200 - 30, width: 30, height: 30, speedX: -2, color: '#8B0000', type: 'walker' },
        { x: 3500, y: 280 - 30, width: 30, height: 30, speedX: -2, color: '#0066FF', type: 'jumper' },
        { x: 3750, y: 320 - 30, width: 30, height: 30, speedX: -2, color: '#8B0000', type: 'walker' },
        { x: 4050, y: 350 - 30, width: 34, height: 34, speedX: -1.5, color: '#5A3A1E', type: 'tank', hp: 2 },
        { x: 4450, y: 300 - 30, width: 30, height: 30, speedX: -2, color: '#0066FF', type: 'jumper' },
        { x: 4750, y: 250 - 30, width: 30, height: 30, speedX: -2, color: '#8B0000', type: 'walker' },
        { x: 5050, y: 200 - 30, width: 30, height: 30, speedX: -2, color: '#0066FF', type: 'jumper' },
        { x: 5300, y: 280 - 30, width: 34, height: 34, speedX: -1.5, color: '#5A3A1E', type: 'tank', hp: 2 },
        { x: 5550, y: 320 - 30, width: 30, height: 30, speedX: -2, color: '#8B0000', type: 'walker' },
        { x: 5850, y: 350 - 30, width: 30, height: 30, speedX: -2, color: '#0066FF', type: 'jumper' },
        { x: 6350, y: 300 - 30, width: 34, height: 34, speedX: -1.5, color: '#5A3A1E', type: 'tank', hp: 2 },
        { x: 6650, y: 250 - 30, width: 30, height: 30, speedX: -2, color: '#8B0000', type: 'walker' },
        { x: 6950, y: 200 - 30, width: 30, height: 30, speedX: -2, color: '#0066FF', type: 'jumper' },
        { x: 7200, y: 280 - 30, width: 34, height: 34, speedX: -1.5, color: '#5A3A1E', type: 'tank', hp: 2 },
        { x: 7450, y: 320 - 30, width: 30, height: 30, speedX: -2, color: '#8B0000', type: 'walker' },
        { x: 7750, y: 350 - 30, width: 30, height: 30, speedX: -2, color: '#0066FF', type: 'jumper' },
        // Extended section enemies
        { x: 8400, y: 300 - 30, width: 30, height: 30, speedX: -2, color: '#8B0000', type: 'walker' },
        { x: 8700, y: 250 - 30, width: 30, height: 30, speedX: -2, color: '#0066FF', type: 'jumper' },
        { x: 9000, y: 280 - 30, width: 30, height: 30, speedX: -2, color: '#8B0000', type: 'walker' },
        { x: 9600, y: 200 - 30, width: 34, height: 34, speedX: -1.5, color: '#5A3A1E', type: 'tank', hp: 2 },
        { x: 9900, y: 350 - 30, width: 30, height: 30, speedX: -2, color: '#0066FF', type: 'jumper' },
        { x: 10250, y: 280 - 30, width: 30, height: 30, speedX: -2, color: '#8B0000', type: 'walker' },
        { x: 10550, y: 240 - 30, width: 30, height: 30, speedX: -2, color: '#0066FF', type: 'jumper' },
        { x: 10850, y: 300 - 30, width: 34, height: 34, speedX: -1.5, color: '#5A3A1E', type: 'tank', hp: 2 },
        { x: 11150, y: 250 - 30, width: 30, height: 30, speedX: -2, color: '#8B0000', type: 'walker' },
        { x: 11500, y: 350 - 30, width: 30, height: 30, speedX: -2, color: '#0066FF', type: 'jumper' }
    ];
    
    // Initialize coins: 7 big coins (125 pts) + 34% of small coins (50 pts, 20x20)
    coins = [
        // Big coins
        { x: 380, y: 240, width: 32, height: 32, collected: false, points: 125 },
        { x: 2200, y: 210, width: 32, height: 32, collected: false, points: 125 },
        { x: 4200, y: 260, width: 32, height: 32, collected: false, points: 125 },
        { x: 6200, y: 260, width: 32, height: 32, collected: false, points: 125 },
        { x: 8200, y: 260, width: 32, height: 32, collected: false, points: 125 },
        { x: 9600, y: 160, width: 32, height: 32, collected: false, points: 125 },
        { x: 11280, y: 310, width: 32, height: 32, collected: false, points: 125 },
        // Small coins (34% of original set)
        { x: 280, y: 280, width: 20, height: 20, collected: false, points: 50 },
        { x: 680, y: 200, width: 20, height: 20, collected: false, points: 50 },
        { x: 1080, y: 240, width: 20, height: 20, collected: false, points: 50 },
        { x: 1550, y: 310, width: 20, height: 20, collected: false, points: 50 },
        { x: 2450, y: 310, width: 20, height: 20, collected: false, points: 50 },
        { x: 3000, y: 210, width: 20, height: 20, collected: false, points: 50 },
        { x: 3500, y: 240, width: 20, height: 20, collected: false, points: 50 },
        { x: 4050, y: 310, width: 20, height: 20, collected: false, points: 50 },
        { x: 4750, y: 210, width: 20, height: 20, collected: false, points: 50 },
        { x: 5300, y: 240, width: 20, height: 20, collected: false, points: 50 },
        { x: 5850, y: 310, width: 20, height: 20, collected: false, points: 50 },
        { x: 6350, y: 260, width: 20, height: 20, collected: false, points: 50 },
        { x: 6650, y: 210, width: 20, height: 20, collected: false, points: 50 },
        { x: 7200, y: 240, width: 20, height: 20, collected: false, points: 50 },
        { x: 7750, y: 310, width: 20, height: 20, collected: false, points: 50 },
        { x: 8400, y: 260, width: 20, height: 20, collected: false, points: 50 },
        { x: 8700, y: 210, width: 20, height: 20, collected: false, points: 50 },
        { x: 9000, y: 240, width: 20, height: 20, collected: false, points: 50 },
        { x: 9900, y: 310, width: 20, height: 20, collected: false, points: 50 },
        { x: 10250, y: 240, width: 20, height: 20, collected: false, points: 50 },
        { x: 10550, y: 200, width: 20, height: 20, collected: false, points: 50 },
        { x: 10850, y: 260, width: 20, height: 20, collected: false, points: 50 },
        { x: 11150, y: 210, width: 20, height: 20, collected: false, points: 50 },
        { x: 11500, y: 310, width: 20, height: 20, collected: false, points: 50 },
        { x: 1280, y: 280, width: 20, height: 20, collected: false, points: 50 },
        { x: 3750, y: 280, width: 20, height: 20, collected: false, points: 50 },
        { x: 4450, y: 260, width: 20, height: 20, collected: false, points: 50 },
        { x: 5550, y: 280, width: 20, height: 20, collected: false, points: 50 },
        { x: 6950, y: 160, width: 20, height: 20, collected: false, points: 50 },
        { x: 7450, y: 280, width: 20, height: 20, collected: false, points: 50 }
    ];
}

// Start game
document.getElementById('startBtn').addEventListener('click', () => {
    document.getElementById('startScreen').classList.add('hidden');
    gameState = 'playing';
    score = 0;
    lives = 3;
    level = 1;
    cameraX = 0;
    invulnerable = false;
    invulnerableTimer = 0;
    canJump = true;
    lastLifeBonusScore = 0; // Reset life bonus tracker
    levelTime = MAX_LEVEL_TIME;
    chargedJumpUsed = false;
    skipAirJumpThisFrame = false;
    midAirJumpCooldownRemaining = 0;

    // Apply selected character
    const ch = CHARACTERS[selectedCharacterIndex];
    player.color = ch.color;
    player.hatColor = ch.hatColor;

    // Reset player
    player.x = 50;
    player.y = 300;
    player.speedX = 0;
    player.speedY = 0;
    player.onGround = false;
    jumpButtonHeld = false;

    // Initialize game data
    initializeGameData();
    
    // Update UI
    document.getElementById('score').textContent = score;
    document.getElementById('lives').textContent = lives;
    document.getElementById('level').textContent = level;
    const timeElement = document.getElementById('time');
    if (timeElement) {
        timeElement.textContent = Math.ceil(levelTime).toString();
    }
});

// Restart game
document.getElementById('restartBtn').addEventListener('click', () => {
    document.getElementById('gameOver').classList.add('hidden');
    document.getElementById('startScreen').classList.remove('hidden');
    gameState = 'start';
});

// Character select UI
function updateCharacterSelectUI() {
    const nameEl = document.getElementById('characterName');
    const previewEl = document.getElementById('characterPreview');
    if (nameEl) nameEl.textContent = CHARACTERS[selectedCharacterIndex].name;
    if (previewEl) {
        previewEl.innerHTML = '';
        CHARACTERS.forEach((ch, i) => {
            const box = document.createElement('div');
            box.className = 'char-box' + (i === selectedCharacterIndex ? ' selected' : '');
            box.style.background = `linear-gradient(to bottom, ${ch.hatColor} 0%, ${ch.hatColor} 28%, ${ch.color} 28%, ${ch.color} 100%)`;
            box.title = ch.name;
            box.addEventListener('click', () => {
                selectedCharacterIndex = i;
                updateCharacterSelectUI();
            });
            previewEl.appendChild(box);
        });
    }
}

document.getElementById('charPrevBtn').addEventListener('click', () => {
    selectedCharacterIndex = (selectedCharacterIndex - 1 + CHARACTERS.length) % CHARACTERS.length;
    updateCharacterSelectUI();
});

document.getElementById('charNextBtn').addEventListener('click', () => {
    selectedCharacterIndex = (selectedCharacterIndex + 1) % CHARACTERS.length;
    updateCharacterSelectUI();
});

// Initialize game data on page load
initializeGameData();
updateCharacterSelectUI();

// Start game loop
gameLoop();
