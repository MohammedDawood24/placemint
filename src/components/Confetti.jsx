import { useEffect, useRef } from 'react'

const COLORS = ['#4C5BD4', '#15A86B', '#E0A43B', '#E5575B', '#7B1FA2', '#F57C00', '#1565C0', '#C2185B', '#FFD700', '#00BCD4', '#FF6F61', '#88D8B0']
const SHAPES = ['rect', 'circle', 'strip']

export default function Confetti({ duration = 4500 }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let W = window.innerWidth
    let H = window.innerHeight
    canvas.width = W
    canvas.height = H

    const handleResize = () => { W = window.innerWidth; H = window.innerHeight; canvas.width = W; canvas.height = H }
    window.addEventListener('resize', handleResize)

    const pieces = []
    const cannonCount = 80 // pieces per cannon per burst
    const bursts = [0, 600, 1200] // three bursts for drama

    function spawnBurst(delay) {
      setTimeout(() => {
        // Left cannon — shoots from bottom-left diagonally up-right
        for (let i = 0; i < cannonCount; i++) {
          pieces.push(createPiece(40, H - 20, -35, // origin x, y, base angle (degrees)
            15 + Math.random() * 20, // spread
            8 + Math.random() * 14)) // speed
        }
        // Right cannon — shoots from bottom-right diagonally up-left
        for (let i = 0; i < cannonCount; i++) {
          pieces.push(createPiece(W - 40, H - 20, -145,
            15 + Math.random() * 20,
            8 + Math.random() * 14))
        }
      }, delay)
    }

    function createPiece(x, y, baseAngle, spread, speed) {
      const angle = (baseAngle + (Math.random() - 0.5) * spread) * Math.PI / 180
      return {
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        w: 4 + Math.random() * 8,
        h: 3 + Math.random() * 5,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        shape: SHAPES[Math.floor(Math.random() * SHAPES.length)],
        rot: Math.random() * 360,
        rotSpeed: (Math.random() - 0.5) * 15,
        opacity: 1,
        gravity: 0.18 + Math.random() * 0.08,
        drag: 0.98 + Math.random() * 0.015,
        born: Date.now(),
      }
    }

    bursts.forEach(d => spawnBurst(d))

    const startTime = Date.now()
    let animId

    function draw() {
      const elapsed = Date.now() - startTime
      ctx.clearRect(0, 0, W, H)

      // Draw cannon flashes for first 300ms of each burst
      bursts.forEach(bd => {
        const be = elapsed - bd
        if (be >= 0 && be < 300) {
          const flashAlpha = 1 - be / 300
          // Left cannon
          ctx.save()
          ctx.translate(40, H - 20)
          ctx.rotate(-55 * Math.PI / 180)
          ctx.fillStyle = `rgba(255, 200, 50, ${flashAlpha * 0.8})`
          ctx.beginPath()
          ctx.moveTo(0, -12)
          ctx.lineTo(60 * (1 - be / 300), 0)
          ctx.lineTo(0, 12)
          ctx.closePath()
          ctx.fill()
          ctx.restore()
          // Right cannon
          ctx.save()
          ctx.translate(W - 40, H - 20)
          ctx.rotate(-125 * Math.PI / 180)
          ctx.fillStyle = `rgba(255, 200, 50, ${flashAlpha * 0.8})`
          ctx.beginPath()
          ctx.moveTo(0, -12)
          ctx.lineTo(60 * (1 - be / 300), 0)
          ctx.lineTo(0, 12)
          ctx.closePath()
          ctx.fill()
          ctx.restore()
        }
      })

      // Draw cannon bases
      const cannonAlpha = Math.min(1, elapsed / 200) * Math.max(0, 1 - (elapsed - duration + 800) / 800)
      if (cannonAlpha > 0) {
        ;[40, W - 40].forEach((cx, idx) => {
          ctx.save()
          ctx.translate(cx, H - 10)
          ctx.rotate((idx === 0 ? -55 : -125) * Math.PI / 180)
          ctx.globalAlpha = Math.min(cannonAlpha, 1)
          // Barrel
          ctx.fillStyle = '#3a3f5c'
          ctx.beginPath()
          ctx.roundRect(-4, -8, 40, 16, 4)
          ctx.fill()
          // Base
          ctx.fillStyle = '#2a2e45'
          ctx.beginPath()
          ctx.arc(0, 0, 14, 0, Math.PI * 2)
          ctx.fill()
          ctx.fillStyle = '#4C5BD4'
          ctx.beginPath()
          ctx.arc(0, 0, 8, 0, Math.PI * 2)
          ctx.fill()
          ctx.restore()
        })
      }

      // Update and draw pieces
      const fadeStart = duration * 0.6
      pieces.forEach(p => {
        p.vx *= p.drag
        p.vy *= p.drag
        p.vy += p.gravity
        p.x += p.vx
        p.y += p.vy
        p.rot += p.rotSpeed

        const age = Date.now() - p.born
        if (age > fadeStart) {
          p.opacity = Math.max(0, 1 - (age - fadeStart) / (duration - fadeStart))
        }
        if (p.opacity <= 0) return

        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rot * Math.PI / 180)
        ctx.globalAlpha = p.opacity
        ctx.fillStyle = p.color

        if (p.shape === 'circle') {
          ctx.beginPath()
          ctx.arc(0, 0, p.w / 2, 0, Math.PI * 2)
          ctx.fill()
        } else if (p.shape === 'strip') {
          ctx.fillRect(-p.w / 2, -1.5, p.w, 3)
        } else {
          ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h)
        }
        ctx.restore()
      })

      if (elapsed < duration + 500) {
        animId = requestAnimationFrame(draw)
      }
    }

    draw()
    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', handleResize)
    }
  }, [duration])

  return (
    <canvas ref={canvasRef} style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
      pointerEvents: 'none', zIndex: 9999,
    }} />
  )
}
