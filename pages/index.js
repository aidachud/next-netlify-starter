import Head from 'next/head'
import { useEffect, useMemo, useRef, useState } from 'react'

const finishes = [
  {
    id: 'exposed',
    name: 'Exposed Aggregate',
    description: 'Stone-forward sparkle with premium traction and depth.',
    tint: '#b7a995',
    grain: 0.6,
    pattern: 'aggregate',
  },
  {
    id: 'broom',
    name: 'Modern Broom Finish',
    description: 'Clean directional texture with crisp contemporary lines.',
    tint: '#d4d2cd',
    grain: 0.25,
    pattern: 'broom',
  },
  {
    id: 'sand',
    name: 'Warm Sand Wash',
    description: 'Soft, coastal-inspired tone with subtle movement.',
    tint: '#d2c0a7',
    grain: 0.35,
    pattern: 'sand',
  },
  {
    id: 'slate',
    name: 'Stamped Slate',
    description: 'Architectural slate pattern for a refined statement.',
    tint: '#b8c2c9',
    grain: 0.3,
    pattern: 'slate',
  },
]

const featureHighlights = [
  {
    title: 'Photo Upload + Masking',
    detail: 'Upload a driveway photo and define the pour area with a simple mask.',
  },
  {
    title: 'Finish Library',
    detail: 'Swap between aggregates, colors, and textures with instant previewing.',
  },
  {
    title: 'Client-Ready Output',
    detail: 'Export polished renders or share a private link for approvals.',
  },
]

const stats = [
  { label: 'Finish combinations', value: '40+' },
  { label: 'Average mockup time', value: '< 4 min' },
  { label: 'Approval speed', value: '2.8x faster' },
]

const maskDefaults = {
  topWidth: 40,
  bottomWidth: 82,
  topOffset: 18,
  bottomOffset: 92,
  curvature: 24,
}

const shapePresets = [
  { id: 'standard', label: 'Standard', settings: maskDefaults },
  {
    id: 'narrow',
    label: 'Narrow',
    settings: { topWidth: 32, bottomWidth: 72, topOffset: 22, bottomOffset: 92, curvature: 18 },
  },
  {
    id: 'wide',
    label: 'Wide',
    settings: { topWidth: 48, bottomWidth: 92, topOffset: 16, bottomOffset: 94, curvature: 28 },
  },
  {
    id: 'curved',
    label: 'Curved',
    settings: { topWidth: 38, bottomWidth: 78, topOffset: 20, bottomOffset: 92, curvature: 42 },
  },
]

const createAggregatePattern = (width, height) => {
  const texture = document.createElement('canvas')
  texture.width = 220
  texture.height = 220
  const ctx = texture.getContext('2d')
  ctx.fillStyle = 'rgba(255, 255, 255, 0.15)'
  ctx.fillRect(0, 0, texture.width, texture.height)

  const stones = 140
  for (let i = 0; i < stones; i += 1) {
    const radius = 2 + Math.random() * 6
    const x = Math.random() * texture.width
    const y = Math.random() * texture.height
    const shade = 160 + Math.random() * 60
    ctx.fillStyle = `rgba(${shade}, ${shade - 10}, ${shade - 20}, 0.5)`
    ctx.beginPath()
    ctx.arc(x, y, radius, 0, Math.PI * 2)
    ctx.fill()
  }

  const pattern = ctx.createPattern(texture, 'repeat')
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const output = canvas.getContext('2d')
  output.fillStyle = pattern
  output.fillRect(0, 0, width, height)
  return canvas
}

const createBroomPattern = (width, height) => {
  const texture = document.createElement('canvas')
  texture.width = 220
  texture.height = 220
  const ctx = texture.getContext('2d')
  ctx.fillStyle = 'rgba(255, 255, 255, 0.1)'
  ctx.fillRect(0, 0, texture.width, texture.height)
  ctx.strokeStyle = 'rgba(120, 120, 120, 0.35)'
  ctx.lineWidth = 2
  for (let i = 0; i < texture.width; i += 10) {
    ctx.beginPath()
    ctx.moveTo(i, 0)
    ctx.lineTo(i, texture.height)
    ctx.stroke()
  }
  const pattern = ctx.createPattern(texture, 'repeat')
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const output = canvas.getContext('2d')
  output.fillStyle = pattern
  output.fillRect(0, 0, width, height)
  return canvas
}

const createSandPattern = (width, height) => {
  const texture = document.createElement('canvas')
  texture.width = 180
  texture.height = 180
  const ctx = texture.getContext('2d')
  ctx.fillStyle = 'rgba(255, 255, 255, 0.1)'
  ctx.fillRect(0, 0, texture.width, texture.height)
  for (let i = 0; i < 1200; i += 1) {
    const size = Math.random() * 2
    const x = Math.random() * texture.width
    const y = Math.random() * texture.height
    ctx.fillStyle = `rgba(160, 150, 135, ${0.2 + Math.random() * 0.3})`
    ctx.fillRect(x, y, size, size)
  }
  const pattern = ctx.createPattern(texture, 'repeat')
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const output = canvas.getContext('2d')
  output.fillStyle = pattern
  output.fillRect(0, 0, width, height)
  return canvas
}

const createSlatePattern = (width, height) => {
  const texture = document.createElement('canvas')
  texture.width = 240
  texture.height = 240
  const ctx = texture.getContext('2d')
  ctx.fillStyle = 'rgba(255, 255, 255, 0.08)'
  ctx.fillRect(0, 0, texture.width, texture.height)
  ctx.strokeStyle = 'rgba(120, 130, 145, 0.45)'
  ctx.lineWidth = 2
  for (let x = 0; x < texture.width; x += 60) {
    for (let y = 0; y < texture.height; y += 60) {
      ctx.strokeRect(x + 2, y + 2, 56, 56)
    }
  }
  const pattern = ctx.createPattern(texture, 'repeat')
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const output = canvas.getContext('2d')
  output.fillStyle = pattern
  output.fillRect(0, 0, width, height)
  return canvas
}

const createPatternCanvas = (pattern, width, height) => {
  if (pattern === 'aggregate') return createAggregatePattern(width, height)
  if (pattern === 'broom') return createBroomPattern(width, height)
  if (pattern === 'sand') return createSandPattern(width, height)
  return createSlatePattern(width, height)
}

export default function Home() {
  const canvasRef = useRef(null)
  const [uploadedImage, setUploadedImage] = useState('/sample-driveway.svg')
  const [selectedFinish, setSelectedFinish] = useState(finishes[0])
  const [opacity, setOpacity] = useState(0.75)
  const [mask, setMask] = useState(maskDefaults)
  const [shapePreset, setShapePreset] = useState('standard')

  const hasImage = Boolean(uploadedImage)

  const finishOptions = useMemo(() => finishes, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !uploadedImage) {
      return
    }

    const context = canvas.getContext('2d')
    const image = new Image()
    image.onload = () => {
      canvas.width = image.width
      canvas.height = image.height
      context.clearRect(0, 0, canvas.width, canvas.height)
      context.drawImage(image, 0, 0, canvas.width, canvas.height)

      const topWidth = (mask.topWidth / 100) * canvas.width
      const bottomWidth = (mask.bottomWidth / 100) * canvas.width
      const topY = (mask.topOffset / 100) * canvas.height
      const bottomY = (mask.bottomOffset / 100) * canvas.height
      const curveDepth = (mask.curvature / 100) * canvas.height
      const centerX = canvas.width / 2

      context.save()
      context.beginPath()
      context.moveTo(centerX - topWidth / 2, topY)
      context.lineTo(centerX + topWidth / 2, topY)
      context.bezierCurveTo(
        centerX + bottomWidth / 2 + curveDepth * 0.2,
        topY + (bottomY - topY) * 0.35,
        centerX + bottomWidth / 2 + curveDepth * 0.2,
        bottomY - curveDepth * 0.2,
        centerX + bottomWidth / 2,
        bottomY
      )
      context.lineTo(centerX - bottomWidth / 2, bottomY)
      context.bezierCurveTo(
        centerX - bottomWidth / 2 - curveDepth * 0.2,
        bottomY - curveDepth * 0.2,
        centerX - bottomWidth / 2 - curveDepth * 0.2,
        topY + (bottomY - topY) * 0.35,
        centerX - topWidth / 2,
        topY
      )
      context.closePath()
      context.clip()

      context.globalAlpha = opacity
      context.fillStyle = selectedFinish.tint
      context.globalCompositeOperation = 'multiply'
      context.fillRect(0, 0, canvas.width, canvas.height)

      const patternCanvas = createPatternCanvas(selectedFinish.pattern, canvas.width, canvas.height)
      context.globalCompositeOperation = 'overlay'
      context.globalAlpha = 0.65
      context.drawImage(patternCanvas, 0, 0)

      const grainCanvas = document.createElement('canvas')
      grainCanvas.width = canvas.width
      grainCanvas.height = canvas.height
      const grainContext = grainCanvas.getContext('2d')
      const imageData = grainContext.createImageData(canvas.width, canvas.height)
      for (let i = 0; i < imageData.data.length; i += 4) {
        const value = 180 + Math.random() * 70
        imageData.data[i] = value
        imageData.data[i + 1] = value
        imageData.data[i + 2] = value
        imageData.data[i + 3] = 255 * selectedFinish.grain
      }
      grainContext.putImageData(imageData, 0, 0)

      context.globalCompositeOperation = 'soft-light'
      context.globalAlpha = 0.5
      context.drawImage(grainCanvas, 0, 0)

      const shadowGradient = context.createLinearGradient(0, topY, 0, bottomY)
      shadowGradient.addColorStop(0, 'rgba(0, 0, 0, 0.05)')
      shadowGradient.addColorStop(0.6, 'rgba(0, 0, 0, 0.12)')
      shadowGradient.addColorStop(1, 'rgba(0, 0, 0, 0.2)')
      context.globalCompositeOperation = 'multiply'
      context.globalAlpha = 0.8
      context.fillStyle = shadowGradient
      context.fillRect(0, 0, canvas.width, canvas.height)

      context.restore()

      context.globalCompositeOperation = 'source-over'
      context.globalAlpha = 1
      context.strokeStyle = 'rgba(255, 255, 255, 0.7)'
      context.lineWidth = 3
      context.setLineDash([14, 10])
      context.stroke()
      context.setLineDash([])
    }
    image.src = uploadedImage
  }, [uploadedImage, selectedFinish, opacity, mask])

  const handleFile = (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (loadEvent) => {
      setUploadedImage(loadEvent.target.result)
    }
    reader.readAsDataURL(file)
  }

  const handlePresetChange = (preset) => {
    setShapePreset(preset.id)
    setMask(preset.settings)
  }

  const handleMaskChange = (key) => (event) => {
    const value = Number(event.target.value)
    setMask((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <>
      <Head>
        <title>Driveway Design Studio</title>
        <meta
          name="description"
          content="Upload a driveway photo and render premium concrete finishes with a stunning, client-ready experience."
        />
      </Head>
      <div className="page">
        <header className="hero">
          <nav className="nav">
            <div className="logo">
              <span className="logo-mark" />
              Driveway Design Studio
            </div>
            <div className="nav-actions">
              <button className="ghost-button" type="button">
                Client Gallery
              </button>
              <button className="primary-button" type="button">
                Book a Demo
              </button>
            </div>
          </nav>
          <div className="hero-grid">
            <div className="hero-copy">
              <p className="eyebrow">Luxury concrete visualization</p>
              <h1>Render stunning driveway concepts from a single photo.</h1>
              <p className="hero-subtitle">
                Give clients a professional, interactive preview of exposed aggregate, stamped
                slate, broom finishes, and more. Upload a driveway photo, mask the pour area, and
                generate refined visual concepts in minutes.
              </p>
              <div className="hero-cta">
                <button className="primary-button" type="button">
                  Start a Visualization
                </button>
                <button className="ghost-button" type="button">
                  View Finish Library
                </button>
              </div>
              <div className="metrics">
                {stats.map((metric) => (
                  <div key={metric.label} className="metric">
                    <p className="metric-value">{metric.value}</p>
                    <p className="metric-label">{metric.label}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="hero-visual">
              <div className="visual-card">
                <div className="visual-header">
                  <span>Before</span>
                  <span className="pill">Raw Base</span>
                </div>
                <div className="visual-image" />
              </div>
              <div className="visual-card accent">
                <div className="visual-header">
                  <span>After</span>
                  <span className="pill">Live Rendering</span>
                </div>
                <div className="visual-image finished" />
                <div className="visual-controls">
                  <div className="control" />
                  <div className="control" />
                  <div className="control" />
                </div>
              </div>
            </div>
          </div>
        </header>

        <section className="section workspace">
          <div className="workspace-copy">
            <p className="eyebrow">Rendering workspace</p>
            <h2>Upload a driveway photo and preview finishes instantly.</h2>
            <p>
              This demo lets you load a real photo, draw a simple driveway mask, and apply custom
              finishes. The renderer blends color, texture, and grain so clients can visualize
              exactly what their driveway could become.
            </p>
          </div>
          <div className="workspace-panel">
            <div className="upload-card">
              <div className="upload-dropzone">
                <div className="upload-icon" />
                <div>
                  <p className="upload-title">Drop driveway photo here</p>
                  <p className="upload-subtitle">JPEG, PNG, or HEIC up to 20MB</p>
                </div>
              </div>
              <div className="upload-actions">
                <label className="primary-button" htmlFor="photo-upload">
                  Upload Photo
                </label>
                <input
                  id="photo-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleFile}
                  hidden
                />
                <button className="ghost-button" type="button" onClick={() => setUploadedImage('/sample-driveway.svg')}>
                  Use Sample Driveway
                </button>
              </div>
              <div className="upload-footer">
                <span className="pill">Edge mask controls</span>
                <span className="pill">HD render export</span>
                <span className="pill">Client share link</span>
              </div>
            </div>

            <div className="renderer">
              <div className="renderer-header">
                <div>
                  <h3>Live Render</h3>
                  <p>{hasImage ? 'Mask & finish applied' : 'Upload a photo to begin'}</p>
                </div>
                <div className="finish-pill">{selectedFinish.name}</div>
              </div>
              <div className="canvas-frame">
                {hasImage ? (
                  <canvas ref={canvasRef} className="render-canvas" />
                ) : (
                  <div className="canvas-placeholder">
                    <p>Load a driveway photo to see the finish preview.</p>
                  </div>
                )}
              </div>
              <div className="controls">
                <div className="control-group">
                  <h4>Finish selection</h4>
                  <div className="finish-grid">
                    {finishOptions.map((finish) => (
                      <button
                        key={finish.id}
                        type="button"
                        className={`finish-card ${finish.id} ${
                          selectedFinish.id === finish.id ? 'active' : ''
                        }`}
                        onClick={() => setSelectedFinish(finish)}
                      >
                        <div className="finish-swatch" />
                        <div>
                          <p className="finish-title">{finish.name}</p>
                          <p className="finish-description">{finish.description}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="control-group">
                  <h4>Finish opacity</h4>
                  <div className="range-row">
                    <input
                      type="range"
                      min="0.3"
                      max="0.95"
                      step="0.01"
                      value={opacity}
                      onChange={(event) => setOpacity(Number(event.target.value))}
                    />
                    <span>{Math.round(opacity * 100)}%</span>
                  </div>
                </div>

                <div className="control-group">
                  <h4>Driveway shape presets</h4>
                  <div className="preset-grid">
                    {shapePresets.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        className={`preset-button ${shapePreset === preset.id ? 'active' : ''}`}
                        onClick={() => handlePresetChange(preset)}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="control-group">
                  <h4>Driveway mask</h4>
                  <div className="range-grid">
                    <label>
                      Top width
                      <input
                        type="range"
                        min="20"
                        max="70"
                        value={mask.topWidth}
                        onChange={handleMaskChange('topWidth')}
                      />
                    </label>
                    <label>
                      Bottom width
                      <input
                        type="range"
                        min="50"
                        max="100"
                        value={mask.bottomWidth}
                        onChange={handleMaskChange('bottomWidth')}
                      />
                    </label>
                    <label>
                      Top offset
                      <input
                        type="range"
                        min="5"
                        max="50"
                        value={mask.topOffset}
                        onChange={handleMaskChange('topOffset')}
                      />
                    </label>
                    <label>
                      Bottom offset
                      <input
                        type="range"
                        min="60"
                        max="98"
                        value={mask.bottomOffset}
                        onChange={handleMaskChange('bottomOffset')}
                      />
                    </label>
                    <label>
                      Curvature
                      <input
                        type="range"
                        min="10"
                        max="60"
                        value={mask.curvature}
                        onChange={handleMaskChange('curvature')}
                      />
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="section designs">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Finish library</p>
              <h2>Offer a curated menu of premium looks.</h2>
              <p>
                Build a signature catalog of colors, aggregates, borders, and sealers. Let clients
                compare options side-by-side for confident approvals.
              </p>
            </div>
            <button className="ghost-button" type="button">
              Manage Library
            </button>
          </div>
          <div className="design-grid">
            {finishes.map((option) => (
              <div key={option.name} className={`design-card ${option.id}`}>
                <div className="design-swatch" />
                <h3>{option.name}</h3>
                <p>{option.description}</p>
                <button className="text-button" type="button">
                  Preview on driveway →
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className="section timeline">
          <div className="timeline-card">
            <div>
              <p className="eyebrow">How it works</p>
              <h2>From photo to approval in three steps.</h2>
            </div>
            <div className="timeline-steps">
              {featureHighlights.map((step, index) => (
                <div key={step.title} className="timeline-step">
                  <div className="step-index">0{index + 1}</div>
                  <div>
                    <h3>{step.title}</h3>
                    <p>{step.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="section cta">
          <div className="cta-card">
            <div>
              <p className="eyebrow">Launch-ready experience</p>
              <h2>Deliver a stunning, professional client journey.</h2>
              <p>
                Your clients expect the same caliber of presentation as the finished driveway.
                Elevate every bid with polished visuals, instant comparisons, and effortless
                approvals.
              </p>
            </div>
            <div className="cta-actions">
              <button className="primary-button" type="button">
                Schedule a Walkthrough
              </button>
              <button className="ghost-button" type="button">
                Download Deck
              </button>
            </div>
          </div>
        </section>
      </div>
    </>
  )
}
