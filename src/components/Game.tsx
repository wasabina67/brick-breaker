import { useRef, useEffect, useState, useCallback } from 'react'

interface GameState {
  score: number
  gameStatus: 'waiting' | 'playing' | 'gameOver' | 'won'
}

interface Ball {
  x: number
  y: number
  dx: number
  dy: number
  radius: number
}

interface Paddle {
  x: number
  y: number
  width: number
  height: number
}

interface Block {
  x: number
  y: number
  width: number
  height: number
  visible: boolean
  color: string
}

const CANVAS_WIDTH = 1200
const CANVAS_HEIGHT = 750
const PADDLE_WIDTH = 300
const PADDLE_HEIGHT = 5
const BALL_RADIUS = 8
const BLOCK_WIDTH = 30
const BLOCK_HEIGHT = 20
const BLOCK_ROWS = 20
const BLOCK_COLS = 30

const Game = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationIdRef = useRef<number>(0)

  const [gameState, setGameState] = useState<GameState>({
    score: 0,
    gameStatus: 'waiting'
  })

  const [ball, setBall] = useState<Ball>({
    x: CANVAS_WIDTH / 2,
    y: CANVAS_HEIGHT - 50,
    dx: 6,
    dy: -6,
    radius: BALL_RADIUS
  })

  const [paddle, setPaddle] = useState<Paddle>({
    x: CANVAS_WIDTH / 2 - PADDLE_WIDTH / 2,
    y: CANVAS_HEIGHT - 30,
    width: PADDLE_WIDTH,
    height: PADDLE_HEIGHT
  })

  const [blocks, setBlocks] = useState<Block[]>(() => {
    const initialBlocks: Block[] = []
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
      '#FF8A80', '#80CBC4', '#81C784', '#FFB74D', '#F06292',
      '#BA68C8', '#64B5F6', '#4DB6AC', '#AED581', '#FFD54F',
      '#FF8A65', '#A1887F', '#90A4AE', '#FFAB91', '#C5E1A5'
    ]

    for (let row = 0; row < BLOCK_ROWS; row++) {
      for (let col = 0; col < BLOCK_COLS; col++) {
        initialBlocks.push({
          x: col * (BLOCK_WIDTH + 5) + 35,
          y: row * (BLOCK_HEIGHT + 5) + 50,
          width: BLOCK_WIDTH,
          height: BLOCK_HEIGHT,
          visible: true,
          color: colors[row]
        })
      }
    }
    return initialBlocks
  })

  const resetGame = useCallback(() => {
    setBall({
      x: CANVAS_WIDTH / 2,
      y: CANVAS_HEIGHT - 50,
      dx: 6,
      dy: -6,
      radius: BALL_RADIUS
    })
    setPaddle({
      x: CANVAS_WIDTH / 2 - PADDLE_WIDTH / 2,
      y: CANVAS_HEIGHT - 30,
      width: PADDLE_WIDTH,
      height: PADDLE_HEIGHT
    })
    setBlocks(prevBlocks => prevBlocks.map(block => ({ ...block, visible: true })))
    setGameState({
      score: 0,
      gameStatus: 'waiting'
    })
  }, [])

  const checkCollision = useCallback((rect1: { x: number, y: number, width: number, height: number }, rect2: { x: number, y: number, width: number, height: number }) => {
    return rect1.x < rect2.x + rect2.width &&
      rect1.x + rect1.width > rect2.x &&
      rect1.y < rect2.y + rect2.height &&
      rect1.y + rect1.height > rect2.y
  }, [])

  const startGame = useCallback(() => {
    setGameState(prev => ({ ...prev, gameStatus: 'playing' }))
  }, [])

  const update = useCallback(() => {
    if (gameState.gameStatus !== 'playing') return

    setBall(prevBall => {
      const newBall = { ...prevBall }

      // Move ball
      newBall.x += newBall.dx
      newBall.y += newBall.dy

      // Wall collision
      if (newBall.x <= newBall.radius || newBall.x >= CANVAS_WIDTH - newBall.radius) {
        newBall.dx = -newBall.dx
      }
      if (newBall.y <= newBall.radius) {
        newBall.dy = -newBall.dy
      }

      // Bottom wall (game over)
      if (newBall.y >= CANVAS_HEIGHT) {
        setGameState(prev => ({ ...prev, gameStatus: 'gameOver' }))
        return newBall
      }

      // Paddle collision
      if (checkCollision({
        x: newBall.x - newBall.radius,
        y: newBall.y - newBall.radius,
        width: newBall.radius * 2,
        height: newBall.radius * 2
      }, paddle)) {
        newBall.dy = -Math.abs(newBall.dy)
        const hitPos = (newBall.x - paddle.x) / paddle.width
        newBall.dx = (hitPos - 0.5) * 8
      }

      return newBall
    })

    // Block collision
    setBlocks(prevBlocks => {
      const newBlocks = [...prevBlocks]

      for (let i = 0; i < newBlocks.length; i++) {
        if (!newBlocks[i].visible) continue

        if (checkCollision({
          x: ball.x - ball.radius,
          y: ball.y - ball.radius,
          width: ball.radius * 2,
          height: ball.radius * 2
        }, newBlocks[i])) {
          newBlocks[i].visible = false
          setGameState(prev => ({ ...prev, score: prev.score + 10 }))
          setBall(prevBall => ({ ...prevBall, dy: -prevBall.dy }))
          break
        }
      }

      // Check win condition
      if (newBlocks.every(block => !block.visible)) {
        setGameState(prev => ({ ...prev, gameStatus: 'won' }))
      }

      return newBlocks
    })
  }, [ball, paddle, gameState.gameStatus, checkCollision])

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear canvas
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

    // Draw ball
    ctx.beginPath()
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2)
    const gradient = ctx.createRadialGradient(ball.x - 2, ball.y - 2, 0, ball.x, ball.y, ball.radius)
    gradient.addColorStop(0, '#FFEF94')
    gradient.addColorStop(0.7, '#FFD700')
    gradient.addColorStop(1, '#B8860B')
    ctx.fillStyle = gradient
    ctx.fill()
    ctx.strokeStyle = '#DAA520'
    ctx.lineWidth = 1
    ctx.stroke()

    // Draw paddle
    ctx.fillStyle = '#333'
    ctx.fillRect(paddle.x, paddle.y, paddle.width, paddle.height)

    // Draw blocks
    blocks.forEach(block => {
      if (block.visible) {
        ctx.fillStyle = block.color
        ctx.fillRect(block.x, block.y, block.width, block.height)
        ctx.strokeStyle = '#FFF'
        ctx.strokeRect(block.x, block.y, block.width, block.height)
      }
    })
  }, [ball, paddle, blocks])

  const gameLoop = useCallback(() => {
    update()
    draw()
    animationIdRef.current = requestAnimationFrame(gameLoop)
  }, [update, draw])

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const canvas = canvasRef.current
      if (!canvas) return

      const rect = canvas.getBoundingClientRect()
      const mouseX = e.clientX - rect.left

      setPaddle(prev => ({
        ...prev,
        x: Math.max(0, Math.min(mouseX - prev.width / 2, CANVAS_WIDTH - prev.width))
      }))
    }

    document.addEventListener('mousemove', handleMouseMove)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
    }
  }, [])

  useEffect(() => {
    if (gameState.gameStatus === 'playing') {
      animationIdRef.current = requestAnimationFrame(gameLoop)
    }

    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current)
      }
    }
  }, [gameLoop, gameState.gameStatus])

  return (
    <div style={{ textAlign: 'center', padding: '0px' }}>
      <div style={{ marginBottom: '10px' }}>
        <div style={{ fontSize: '18px', marginBottom: '10px' }}>
          Score: {gameState.score}
        </div>
      </div>

      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        style={{
          border: '1px solid #333',
          backgroundColor: '#F0F0F0',
          display: 'block',
          margin: '0 auto'
        }}
      />

      {gameState.gameStatus === 'waiting' && (
        <div style={{ marginTop: '10px' }}>
          <h2 style={{ marginTop: '10px', marginBottom: '10px' }}>
            Ready to Start!
          </h2>
          <button
            onClick={startGame}
            style={{
              padding: '10px 20px',
              fontSize: '16px',
              backgroundColor: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            Start Game
          </button>
        </div>
      )}

      {(gameState.gameStatus === 'gameOver' || gameState.gameStatus === 'won') && (
        <div style={{ marginTop: '10px' }}>
          <h2 style={{ marginTop: '10px', marginBottom: '10px' }}>
            {gameState.gameStatus === 'gameOver' ? 'Game Over!' : 'You Won!'}
          </h2>
          <button
            onClick={resetGame}
            style={{
              padding: '10px 10px',
              fontSize: '16px',
              backgroundColor: '#4ECDC4',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            Play Again
          </button>
        </div>
      )}

      <div style={{ marginTop: '10px', fontSize: '14px', color: '#666' }}>
        Use mouse to move the paddle.
      </div>
    </div>
  )
}

export default Game
