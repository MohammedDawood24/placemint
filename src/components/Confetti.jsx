import { useEffect, useRef } from 'react'

const COLORS = ['#4C5BD4', '#15A86B', '#E0A43B', '#E5575B', '#7B1FA2', '#F57C00', '#1565C0', '#C2185B', '#FFD700', '#00BCD4']

export default function Confetti({ duration = 3000 }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    const pieces = []
    for (let i = 0; i < 150; i++) {
      pieces.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height - canvas.height,
        w: Math.random() * 10 + 5,
        h: Math.random() * 6 + 3,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        vx: (Math.random() - 0.5) * 6,
        vy: Math.random() * 4 + 2,
        rot: Math.random() * 360,
        rotSpeed: (Math.random() - 0.5) * 12,
        opacity: 1,
      })
    }

    let startTime = Date.now()
    let animId

    function draw() {
      const elapsed = Date.now() - startTime
      const fadeStart = duration * 0.6
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      pieces.forEach(p => {
        p.x += p.vx
        p.y += p.vy
        p.vy += 0.08
        p.rot += p.rotSpeed
        if (elapsed > fadeStart) {
          p.opacity = Math.max(0, 1 - (elapsed - fadeStart) / (duration - fadeStart))
        }

        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate((p.rot * Math.PI) / 180)
        ctx.globalAlpha = p.opacity
        ctx.fillStyle = p.color
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h)
        ctx.restore()
      })

      if (elapsed < duration) {
        animId = requestAnimationFrame(draw)
      }
    }

    draw()
    return () => cancelAnimationFrame(animId)
  }, [duration])

  return (
    <canvas ref={canvasRef} style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
      pointerEvents: 'none', zIndex: 9999,
    }} />
  )
}
