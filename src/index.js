import Phaser from 'phaser'

const DASH_COOLDOWN = 2000 // Cooldown duration in milliseconds
const DASH_DISTANCE = 200 // Distance of the dash
const DASH_DURATION = 300 // Duration of the dash in milliseconds
const TWEEN_DURATION = 500 // Duration of the tween in milliseconds
const JUMP_VELOCITY = -330 // Jump velocity
const PUNCH_RANGE = 50 // Range of the punch

class PlayerScene extends Phaser.Scene {
    constructor() {
        super({ key: 'PlayerScene' })
        this.lastDashTimes = { player1: 0, player2: 0 }
    }

    preload() {
        // Load sprite sheet
        this.load.spritesheet('player', `${location.protocol+"//"+location.host+location.pathname}player_test.png`, {
            frameWidth: 64, // Width of each frame
            frameHeight: 64 // Height of each frame
        });
        this.load.image('ground', `${location.protocol+"//"+location.host+location.pathname}ground.png`)  
    }

    create() {
        // Initial resize setup
        this.resize()

        // Create ground platform
        this.ground = this.physics.add.staticGroup()
        this.ground.create(this.cameras.main.centerX, this.cameras.main.height - 50, 'ground')
            .setDisplaySize(this.cameras.main.width, 100)
            .refreshBody()

        // Create players
        this.player1 = this.createPlayer(400, 300)
        this.player2 = this.createPlayer(200, 300)

        // Set up keyboard input
        this.setupInput()

        // Define animations
        this.anims.create({
            key: 'walk-right',
            frames: this.anims.generateFrameNumbers('player', { start: 9, end: 15 }), // Frames 9 to 15
            frameRate: 10,
            repeat: -1
        });
        this.anims.create({
            key: 'walk-left',
            frames: this.anims.generateFrameNumbers('player', { start: 9, end: 15 }), // Use the same frames for left movement
            frameRate: 10,
            repeat: -1
        });

        this.anims.create({
            key: 'jump',
            frames: this.anims.generateFrameNumbers('player', { start: 27, end: 33 }), // Frames 27 to 33
            frameRate: 10,
            repeat: 0
        });

        // Handle window resize
        window.addEventListener('resize', () => this.resize())
    }

    update(time) {
        this.handleMovement(this.player1, this.keys1, time)
        this.handleMovement(this.player2, this.keys2, time)
        this.checkPunch(this.player1, this.keys1)
        this.checkPunch(this.player2, this.keys2)
    }

    createPlayer(x, y) {
        const player = this.physics.add.sprite(x, y, 'player')
        player.setOrigin(0.5, 0.5)
            .setBounce(0.2)
            .setCollideWorldBounds(true)
        this.physics.add.collider(player, this.ground)

        player.setDisplaySize(64, 64)
        player.lastMovementDirection = 'right' // Initialize default direction
        player.setFrame(9) // Set initial frame

        return player
    }

    setupInput() {
        this.keys1 = this.input.keyboard.addKeys({
            moveLeft: Phaser.Input.Keyboard.KeyCodes.A,
            moveRight: Phaser.Input.Keyboard.KeyCodes.D,
            dash: Phaser.Input.Keyboard.KeyCodes.Q,
            jump: Phaser.Input.Keyboard.KeyCodes.W,
            punch: Phaser.Input.Keyboard.KeyCodes.Z
        })

        this.keys2 = this.input.keyboard.addKeys({
            moveLeft: Phaser.Input.Keyboard.KeyCodes.LEFT,
            moveRight: Phaser.Input.Keyboard.KeyCodes.RIGHT,
            dash: Phaser.Input.Keyboard.KeyCodes.DOWN,
            jump: Phaser.Input.Keyboard.KeyCodes.UP,
            punch: Phaser.Input.Keyboard.KeyCodes.MINUS
        })
    }

    handleMovement(player, keys, currentTime) {
        if (keys.moveRight.isDown && !player.tweenInProgress && !player.dashInProgress) {
            player.setVelocityX(160); // Example velocity
            player.anims.play('walk-right', true); // Play walking right animation
            player.setScale(1, 1); // Ensure the sprite is not flipped
            player.lastMovementDirection = 'right'
        } else if (keys.moveLeft.isDown && !player.tweenInProgress && !player.dashInProgress) {
            player.setVelocityX(-160); // Example velocity
            player.anims.play('walk-left', true); // Play walking left animation
            player.setScale(-1, 1); // Flip the sprite horizontally for left movement
            player.lastMovementDirection = 'left'
        } else {
            player.setVelocityX(0);
            if (!player.anims.isPlaying || player.anims.currentAnim.key !== 'jump') {
                player.anims.stop(); // Stop animation when idle
            }
        }

        if (keys.jump.isDown && player.body.touching.down) {
            player.setVelocityY(JUMP_VELOCITY);
            player.anims.play('jump', true); // Play jumping animation
        }

        if (keys.dash.isDown && !player.dashInProgress) {
            if (currentTime - this.lastDashTimes[this.getPlayerKey(player)] >= DASH_COOLDOWN) {
                this.startDash(player)
                this.lastDashTimes[this.getPlayerKey(player)] = currentTime
            }
        }
    }

    startTween(player, targetX) {
        player.tweenInProgress = true

        this.tweens.add({
            targets: player,
            x: targetX,
            duration: TWEEN_DURATION,
            ease: 'Linear.None',
            onComplete: () => {
                player.tweenInProgress = false
            }
        })
    }

    startDash(player) {
        player.dashInProgress = true
        const dashDirection = player.lastMovementDirection === 'left' ? -1 : 1
        const targetX = player.x + DASH_DISTANCE * dashDirection

        this.tweens.add({
            targets: player,
            x: targetX,
            duration: DASH_DURATION,
            ease: t => 0.5 * (1 - Math.cos(Math.PI * t)),
            onComplete: () => {
                this.tweens.add({
                    targets: player,
                    x: player.x - 20 * dashDirection,
                    duration: 200,
                    ease: 'Linear.None',
                    onComplete: () => {
                        player.dashInProgress = false
                    }
                })
            }
        })

        this.cameras.main.shake(100, 0.01)
    }

    checkPunch(player, keys) {
        if (keys.punch.isDown) {
            const punchDirection = player.lastMovementDirection === 'left' ? -1 : 1
            const punchX = player.x + punchDirection * PUNCH_RANGE
            const punchArea = new Phaser.Geom.Rectangle(punchX - 10, player.y - 10, 20, 20) // Define punch area

            let otherPlayer = player === this.player1 ? this.player2 : this.player1
            if (Phaser.Geom.Rectangle.Overlaps(punchArea, otherPlayer.getBounds())) {
                this.handlePunchCollision(otherPlayer)
            }
        }
    }

    handlePunchCollision(otherPlayer) {
        console.log(`Punch hit player at ${otherPlayer.x}!`)

        const punchDirection = otherPlayer.x > (this.player1.x + this.player2.x) / 2 ? 1 : -1
        const impulseStrength = 100 // Impulse strength

        this.tweens.add({
            targets: otherPlayer,
            x: otherPlayer.x + (punchDirection * impulseStrength),
            duration: 500,
            ease: 'Quad.easeOut',
            onStart: () => {
              otherPlayer.setVelocityX(0)
              this.cameras.main.shake(100, 0.01)
            },
            onComplete: () => {
              otherPlayer.setVelocityX(0)
            }
        })

        this.tweens.add({
            targets: otherPlayer,
            y: otherPlayer.y - 10,
            duration: 100,
            ease: 'Quad.easeOut',
            yoyo: true
        })
    }

    getPlayerKey(player) {
        return player === this.player1 ? 'player1' : 'player2'
    }

    resize() {
        const { width: canvasWidth, height: canvasHeight } = this.scale

        this.scale.resize(canvasWidth, canvasHeight)

        if (this.ground) {
            this.ground.children.iterate(child => {
                child.setDisplaySize(canvasWidth, 100)
                child.setPosition(canvasWidth / 2, canvasHeight - 50)
            })
        }

        this.cameras.main.setBounds(0, 0, canvasWidth, canvasHeight)
    }
}

const config = {
    type: Phaser.AUTO,
    width: window.innerWidth,
    height: window.innerHeight,
    scene: PlayerScene,
    backgroundColor: "#ffffff",
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 300 },
            debug: false
        }
    },
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    }
}

const game = new Phaser.Game(config)
