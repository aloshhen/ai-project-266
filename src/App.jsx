import React, { useEffect, useRef, useState, useCallback } from 'react'
import { motion, useScroll, useTransform, useSpring, useInView } from 'framer-motion'
import { clsx, ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

// Safe Icon Component - converts kebab-case to PascalCase
function SafeIcon({ name, size = 24, className, color }) {
  const [Icon, setIcon] = useState(null)

  useEffect(() => {
    import('lucide-react').then((icons) => {
      const pascalCase = name
        .split('-')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join('')
      const iconComponent = icons[pascalCase] || icons.HelpCircle
      setIcon(() => iconComponent)
    })
  }, [name])

  if (!Icon) return <div style={{ width: size, height: size }} className={className} />
  return <Icon size={size} className={className} color={color} />
}

// Utility for tailwind classes
function cn(...inputs) {
  return twMerge(clsx(inputs))
}

// 8-bit Audio Synth
function useRetroAudio() {
  const audioContext = useRef(null)

  const initAudio = useCallback(() => {
    if (!audioContext.current) {
      audioContext.current = new (window.AudioContext || window.webkitAudioContext)()
    }
  }, [])

  const playTone = useCallback((freq, duration, type = 'square') => {
    if (!audioContext.current) return
    const osc = audioContext.current.createOscillator()
    const gain = audioContext.current.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(freq, audioContext.current.currentTime)
    gain.gain.setValueAtTime(0.1, audioContext.current.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.01, audioContext.current.currentTime + duration)
    osc.connect(gain)
    gain.connect(audioContext.current.destination)
    osc.start()
    osc.stop(audioContext.current.currentTime + duration)
  }, [])

  const playCatch = useCallback(() => {
    playTone(880, 0.1)
    setTimeout(() => playTone(1100, 0.15), 50)
  }, [playTone])

  const playMiss = useCallback(() => {
    playTone(220, 0.3, 'sawtooth')
  }, [playTone])

  const playBGM = useCallback(() => {
    if (!audioContext.current) return
    const notes = [440, 554, 659, 554, 440, 554, 659, 880]
    let noteIndex = 0
    const interval = setInterval(() => {
      playTone(notes[noteIndex % notes.length], 0.2)
      noteIndex++
    }, 250)
    return () => clearInterval(interval)
  }, [playTone])

  return { initAudio, playCatch, playMiss, playBGM }
}

// Chaos Icon Physics
class ChaosIcon {
  constructor(canvasWidth, canvasHeight) {
    this.x = Math.random() * canvasWidth
    this.y = Math.random() * canvasHeight
    this.vx = (Math.random() - 0.5) * 4
    this.vy = (Math.random() - 0.5) * 4
    this.size = 24 + Math.random() * 24
    this.rotation = Math.random() * 360
    this.rotationSpeed = (Math.random() - 0.5) * 4
    this.color = ['#ff00ff', '#00ffff', '#ffff00', '#ff0044', '#44ff00'][Math.floor(Math.random() * 5)]
    this.iconNames = ['star', 'zap', 'flame', 'sparkles', 'rocket', 'ghost', 'gamepad-2', 'skull', 'trophy', 'bomb']
    this.iconName = this.iconNames[Math.floor(Math.random() * this.iconNames.length)]
    this.bounce = 0.9
  }

  update(canvasWidth, canvasHeight, icons) {
    this.x += this.vx
    this.y += this.vy
    this.rotation += this.rotationSpeed

    // Wall collisions
    if (this.x < 0 || this.x > canvasWidth - this.size) {
      this.vx *= -this.bounce
      this.x = Math.max(0, Math.min(this.x, canvasWidth - this.size))
    }
    if (this.y < 0 || this.y > canvasHeight - this.size) {
      this.vy *= -this.bounce
      this.y = Math.max(0, Math.min(this.y, canvasHeight - this.size))
    }

    // Icon collisions (simplified)
    icons.forEach((other) => {
      if (other === this) return
      const dx = other.x - this.x
      const dy = other.y - this.y
      const distance = Math.sqrt(dx * dx + dy * dy)
      const minDistance = (this.size + other.size) / 2

      if (distance < minDistance) {
        const angle = Math.atan2(dy, dx)
        const force = 2
        this.vx -= Math.cos(angle) * force
        this.vy -= Math.sin(angle) * force
        other.vx += Math.cos(angle) * force
        other.vy += Math.sin(angle) * force
      }
    })
  }

  draw(ctx) {
    ctx.save()
    ctx.translate(this.x + this.size/2, this.y + this.size/2)
    ctx.rotate((this.rotation * Math.PI) / 180)
    ctx.fillStyle = this.color
    ctx.shadowColor = this.color
    ctx.shadowBlur = 10
    ctx.fillRect(-this.size/2, -this.size/2, this.size, this.size)
    ctx.restore()
  }
}

// Emoji Game Component
function EmojiGame({ onScore, audio }) {
  const canvasRef = useRef(null)
  const [score, setScore] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  const gameState = useRef({
    platformX: 0,
    emojis: [],
    particles: [],
    lastSpawn: 0,
    animationId: null
  })

  const emojisList = ['🍕', '🦄', '👾', '🌈', '⚡', '💎', '🎮', '👽', '🍄', '🎲']

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    const resize = () => {
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
      gameState.current.platformX = canvas.width / 2 - 50
    }
    resize()
    window.addEventListener('resize', resize)

    // Input handling
    const handleMove = (e) => {
      const rect = canvas.getBoundingClientRect()
      const clientX = e.touches ? e.touches[0].clientX : e.clientX
      const x = clientX - rect.left
      gameState.current.platformX = Math.max(0, Math.min(x - 50, canvas.width - 100))
    }

    canvas.addEventListener('mousemove', handleMove)
    canvas.addEventListener('touchmove', handleMove)

    const spawnEmoji = () => {
      gameState.current.emojis.push({
        x: Math.random() * (canvas.width - 40),
        y: -40,
        emoji: emojisList[Math.floor(Math.random() * emojisList.length)],
        speed: 2 + Math.random() * 3 + (score * 0.1),
        size: 30 + Math.random() * 10
      })
    }

    const createParticles = (x, y) => {
      for (let i = 0; i < 8; i++) {
        gameState.current.particles.push({
          x, y,
          vx: (Math.random() - 0.5) * 10,
          vy: (Math.random() - 0.5) * 10,
          life: 1,
          color: ['#ff00ff', '#00ffff', '#ffff00'][Math.floor(Math.random() * 3)]
        })
      }
    }

    const gameLoop = (timestamp) => {
      if (gameOver) return

      ctx.fillStyle = 'rgba(0, 0, 0, 0.2)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Spawn emojis
      if (timestamp - gameState.current.lastSpawn > 1000) {
        spawnEmoji()
        gameState.current.lastSpawn = timestamp
      }

      // Update and draw emojis
      gameState.current.emojis = gameState.current.emojis.filter((emoji) => {
        emoji.y += emoji.speed

        // Check catch
        if (
          emoji.y + emoji.size > canvas.height - 20 &&
          emoji.y < canvas.height &&
          emoji.x > gameState.current.platformX &&
          emoji.x < gameState.current.platformX + 100
        ) {
          setScore(s => {
            const newScore = s + 1
            onScore(newScore)
            return newScore
          })
          createParticles(emoji.x, emoji.y)
          audio.playCatch()
          return false
        }

        // Check miss
        if (emoji.y > canvas.height) {
          audio.playMiss()
          return false
        }

        // Draw emoji
        ctx.font = `${emoji.size}px monospace`
        ctx.textAlign = 'center'
        ctx.fillText(emoji.emoji, emoji.x, emoji.y)

        return true
      })

      // Update particles
      gameState.current.particles = gameState.current.particles.filter((p) => {
        p.x += p.vx
        p.y += p.vy
        p.life -= 0.05

        if (p.life > 0) {
          ctx.globalAlpha = p.life
          ctx.fillStyle = p.color
          ctx.fillRect(p.x, p.y, 4, 4)
          ctx.globalAlpha = 1
          return true
        }
        return false
      })

      // Draw platform
      const gradient = ctx.createLinearGradient(
        gameState.current.platformX,
        canvas.height - 20,
        gameState.current.platformX + 100,
        canvas.height
      )
      gradient.addColorStop(0, '#ff00ff')
      gradient.addColorStop(1, '#00ffff')
      ctx.fillStyle = gradient
      ctx.shadowColor = '#ff00ff'
      ctx.shadowBlur = 20
      ctx.fillRect(gameState.current.platformX, canvas.height - 20, 100, 10)
      ctx.shadowBlur = 0

      // Score
      ctx.fillStyle = '#fff'
      ctx.font = '16px "Press Start 2P"'
      ctx.textAlign = 'left'
      ctx.fillText(`SCORE: ${score}`, 10, 30)

      gameState.current.animationId = requestAnimationFrame(gameLoop)
    }

    gameState.current.animationId = requestAnimationFrame(gameLoop)

    return () => {
      window.removeEventListener('resize', resize)
      canvas.removeEventListener('mousemove', handleMove)
      canvas.removeEventListener('touchmove', handleMove)
      cancelAnimationFrame(gameState.current.animationId)
    }
  }, [score, gameOver, audio, onScore])

  return (
    <div className="relative w-full h-64 md:h-96 bg-black/50 rounded-xl border-2 border-fuchsia-500 overflow-hidden">
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-none"
      />
      <div className="absolute top-2 right-2 text-yellow-400 font-pixel text-xs">
        CATCH THE EMOJI!
      </div>
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-gray-400 text-xs font-mono">
        Move mouse/touch to control platform
      </div>
    </div>
  )
}

// Floating Icons Canvas
function FloatingIcons() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    const icons = []

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    // Create icons
    for (let i = 0; i < 15; i++) {
      icons.push(new ChaosIcon(canvas.width, canvas.height))
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      icons.forEach((icon) => {
        icon.update(canvas.width, canvas.height, icons)
        icon.draw(ctx)
      })

      requestAnimationFrame(animate)
    }

    const animationId = requestAnimationFrame(animate)

    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(animationId)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ mixBlendMode: 'screen' }}
    />
  )
}

// Random Block Component
function ChaosBlock({ children, className, delay = 0 }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-100px" })

  const randomRotate = Math.random() * 6 - 3
  const randomX = Math.random() * 40 - 20

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 100, rotate: randomRotate - 10, scale: 0.8 }}
      animate={isInView ? {
        opacity: 1,
        y: 0,
        rotate: randomRotate,
        scale: 1,
        x: randomX
      } : {}}
      transition={{
        duration: 0.6,
        delay,
        type: "spring",
        stiffness: 100
      }}
      whileHover={{
        scale: 1.05,
        rotate: randomRotate + 5,
        transition: { type: "spring", stiffness: 300 }
      }}
      className={cn(
        "relative p-6 md:p-8 backdrop-blur-sm border-2",
        className
      )}
    >
      {children}
    </motion.div>
  )
}

// Main App
function App() {
  const { scrollYProgress } = useScroll()
  const [chaosScore, setChaosScore] = useState(0)
  const [superChaos, setSuperChaos] = useState(false)
  const audio = useRetroAudio()
  const [audioStarted, setAudioStarted] = useState(false)

  // Background colors based on scroll
  const backgroundColor = useTransform(
    scrollYProgress,
    [0, 0.25, 0.5, 0.75, 1],
    [
      "linear-gradient(to bottom, #0f0f0f, #1a1a2e)",
      "linear-gradient(to bottom, #1a1a2e, #16213e)",
      "linear-gradient(to bottom, #16213e, #0f3460)",
      "linear-gradient(to bottom, #0f3460, #533483)",
      "linear-gradient(to bottom, #533483, #e94560)"
    ]
  )

  const hueRotate = useTransform(scrollYProgress, [0, 1], [0, 360])
  const glitchIntensity = useTransform(scrollYProgress, [0, 1], [0, 20])

  const springGlitch = useSpring(glitchIntensity, { stiffness: 100, damping: 30 })

  const startAudio = () => {
    audio.initAudio()
    setAudioStarted(true)
    audio.playBGM()
  }

  const handleScore = (score) => {
    setChaosScore(score)
    if (score >= 10 && !superChaos) {
      setSuperChaos(true)
      audio.playTone(1200, 0.5)
    }
  }

  const blocks = [
    { title: "VOID ZONE", content: "☠️ ENTER AT OWN RISK ☠️", color: "border-red-500 bg-red-950/30", icon: "skull" },
    { title: "GLITCH CORE", content: "REALITY IS BROKEN HERE", color: "border-cyan-500 bg-cyan-950/30", icon: "cpu" },
    { title: "RANDOM DATA", content: "01001000 01001001", color: "border-green-500 bg-green-950/30", icon: "binary" },
    { title: "ERROR 404", content: "SANITY NOT FOUND", color: "border-yellow-500 bg-yellow-950/30", icon: "alert-triangle" },
    { title: "NEON DREAMS", content: "FUTURE IS LOADING...", color: "border-fuchsia-500 bg-fuchsia-950/30", icon: "sparkles" },
    { title: "CYBER ZONE", content: "UPLOAD COMPLETE ✓", color: "border-blue-500 bg-blue-950/30", icon: "wifi" },
  ]

  return (
    <motion.div
      className="min-h-screen vhs-container mobile-safe-container overflow-x-hidden"
      style={{
        background: backgroundColor,
        filter: superChaos ? `hue-rotate(${springGlitch.get()}deg) contrast(1.2)` : 'none'
      }}
    >
      {/* VHS Effects */}
      <div className="noise" />
      <div className="scanline" />

      {/* Floating Physics Icons */}
      <FloatingIcons />

      {/* Audio Start Button */}
      {!audioStarted && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={startAudio}
          className="fixed top-4 right-4 z-50 bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-pixel text-xs px-4 py-2 retro-btn"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
        >
          START AUDIO 🔊
        </motion.button>
      )}

      {/* Super Chaos Mode Indicator */}
      {superChaos && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1, rotate: [0, 5, -5, 0] }}
          className="fixed top-20 right-4 z-50 bg-yellow-400 text-black font-pixel text-xs px-4 py-2 border-4 border-red-500"
        >
          ⚠️ SUPER CHAOS MODE ⚠️
        </motion.div>
      )}

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center px-4 py-20">
        <motion.div
          className="text-center z-10"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, type: "spring" }}
        >
          <motion.h1
            className="text-4xl md:text-8xl font-pixel text-white mb-4 chromatic-aberration"
            animate={{
              x: [0, -2, 2, -2, 0],
              skewX: [0, 5, -5, 0]
            }}
            transition={{ duration: 0.2, repeat: Infinity, repeatDelay: 3 }}
          >
            CHAOS
          </motion.h1>
          <motion.h2
            className="text-2xl md:text-4xl font-pixel text-cyan-400 mb-8"
            style={{ textShadow: '4px 4px #ff00ff' }}
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ duration: 0.5, repeat: Infinity }}
          >
            LANDING.exe
          </motion.h2>
          <p className="text-gray-400 font-mono text-sm md:text-base max-w-md mx-auto mb-8">
            Warning: This website contains uncontrolled levels of randomness,
            flying icons, and temporal distortions.
          </p>
          <motion.div
            className="text-fuchsia-500 font-pixel text-xs animate-pulse"
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            ↓ SCROLL TO DESCEND ↓
          </motion.div>
        </motion.div>
      </section>

      {/* Game Section */}
      <section className="relative px-4 py-20 z-10">
        <div className="max-w-4xl mx-auto">
          <motion.h2
            className="text-3xl md:text-5xl font-pixel text-yellow-400 text-center mb-8"
            style={{ WebkitTextStroke: '2px black' }}
          >
            CATCH THE EMOJI GAME
          </motion.h2>
          <EmojiGame onScore={handleScore} audio={audio} />
          <motion.div
            className="mt-4 text-center text-cyan-400 font-mono"
            animate={{ x: [-5, 5, -5] }}
            transition={{ duration: 0.1, repeat: Infinity }}
          >
            Current Score: {chaosScore} | Target: 10 for SUPER CHAOS
          </motion.div>
        </div>
      </section>

      {/* Chaos Blocks Grid */}
      <section className="relative px-4 py-20 z-10">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl md:text-4xl font-pixel text-white text-center mb-12 glitch-text">
            RANDOM_DATA_BLOCKS
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {blocks.map((block, i) => (
              <ChaosBlock
                key={i}
                className={cn(
                  block.color,
                  superChaos && "animate-wobble"
                )}
                delay={i * 0.1}
              >
                <div className="flex items-center gap-3 mb-4">
                  <SafeIcon
                    name={block.icon}
                    size={32}
                    className={cn(
                      "text-white",
                      superChaos && "animate-spin"
                    )}
                  />
                  <h3 className="text-xl font-pixel text-white">{block.title}</h3>
                </div>
                <p className="text-gray-300 font-mono text-sm">{block.content}</p>
                <div className="absolute -top-2 -right-2 w-4 h-4 bg-white animate-ping" />
              </ChaosBlock>
            ))}
          </div>
        </div>
      </section>

      {/* Glitch Text Section */}
      <section className="relative px-4 py-20 overflow-hidden">
        <motion.div
          className="max-w-4xl mx-auto text-center"
          style={{ filter: `hue-rotate(${hueRotate.get()}deg)` }}
        >
          <motion.p
            className="text-6xl md:text-9xl font-black text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-500 via-cyan-500 to-yellow-500 font-pixel"
            animate={{
              skewX: [0, 10, -10, 0],
              scale: [1, 1.1, 1]
            }}
            transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}
          >
            DISORDER
          </motion.p>
          <p className="mt-8 text-gray-400 font-mono text-lg">
            The only rule is that there are no rules.
          </p>
        </motion.div>
      </section>

      {/* Easter Egg Section */}
      <section className="relative px-4 py-20 z-10">
        <motion.div
          className="max-w-2xl mx-auto bg-black/50 border-2 border-green-500 p-8 rounded-lg"
          whileHover={{ scale: 1.02, rotate: 1 }}
        >
          <h3 className="text-xl font-pixel text-green-400 mb-4">SECRET COMMANDS:</h3>
          <ul className="space-y-2 font-mono text-sm text-gray-300">
            <li className="flex items-center gap-2">
              <span className="text-yellow-400">Ctrl+Shift+U</span>
              <span>→ Unknown consequences</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-yellow-400">Catch 10 emojis</span>
              <span>→ Super Chaos Mode</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-yellow-400">Keep scrolling</span>
              <span>→ Reality distortion</span>
            </li>
          </ul>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="relative px-4 py-12 border-t-2 border-fuchsia-500/30 telegram-safe-bottom">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            className="text-4xl font-pixel text-white mb-4"
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            END OF LINE
          </motion.div>
          <p className="text-gray-500 font-mono text-xs">
            © {new Date().getFullYear()} CHAOS INC. | NO RIGHTS RESERVED
          </p>
          <p className="text-gray-600 font-mono text-xs mt-2">
            Built with React, Vite, and pure insanity
          </p>
        </div>
      </footer>
    </motion.div>
  )
}

export default App