import Head from 'next/head'
import { useEffect, useRef, useState } from 'react'

const finishes = [
  {
    id: 'light-stone',
    name: 'Light Stone Concrete',
    description: 'Cool grey surface inspired by modern driveway pours.',
    tint: '#c5ced6',
    grain: 0.2,
    pattern: 'smooth',
  },
  {
    id: 'smooth',
    name: 'Smooth Concrete',
    description: 'Clean, solid surface inspired by modern concrete pours.',
    tint: '#c9d0d6',
    grain: 0.18,
    pattern: 'smooth',
  },
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
    detail: 'Upload a driveway photo and click along the edge to map the pour area.',
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

const referenceImage = '/reference-driveway.svg'

export default function Home() {
  const canvasRef = useRef(null)
  const [uploadedImage, setUploadedImage] = useState('/sample-driveway.svg')
  const [renderedTexture, setRenderedTexture] = useState(null)
  const [isRendering, setIsRendering] = useState(false)
  const [renderStage, setRenderStage] = useState('')
  const [renderError, setRenderError] = useState('')
  const [selectedReference, setSelectedReference] = useState(referenceImage)
  const [referenceLabel, setReferenceLabel] = useState('Reference Driveway')

  const hasImage = Boolean(uploadedImage)

  const statusMessage = !hasImage
    ? 'Upload a photo to begin'
    : isRendering
      ? renderStage || 'Rendering with OpenAI...'
      : renderedTexture
        ? 'OpenAI render applied'
        : 'Upload a photo and render with the selected reference'

  useEffect(() => {
    setRenderedTexture(null)
    setRenderError('')
  }, [uploadedImage])

  const getImageDataUrl = async (source) => {
    if (source.startsWith('data:')) return source
    const response = await fetch(source)
    const blob = await response.blob()
    return await new Promise((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result)
      reader.readAsDataURL(blob)
    })
  }

  const requestOpenAIRender = async () => {
    const canvas = canvasRef.current
    if (!canvas) return
    setIsRendering(true)
    setRenderError('')
    setRenderStage('Sending to OpenAI...')
    try {
      const imageData = await getImageDataUrl(uploadedImage)
      const referenceData = selectedReference
        ? await getImageDataUrl(selectedReference)
        : null
      const response = await fetch('/api/render-driveway', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteImageUrl: imageData,
          referenceImageUrl: referenceData,
          styleName: referenceLabel,
        }),
      })
      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload.error || 'OpenAI render failed.')
      }
      setRenderStage('Rendering finish...')
      setRenderedTexture(payload.textureImage)
    } catch (error) {
      setRenderError(error.message)
    } finally {
      setIsRendering(false)
      setRenderStage('')
    }
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !uploadedImage) {
      return
    }

    const context = canvas.getContext('2d')
    const baseImage = new Image()
    const renderImage = new Image()

    const draw = (image) => {
      canvas.width = image.width
      canvas.height = image.height
      context.clearRect(0, 0, canvas.width, canvas.height)
      context.drawImage(image, 0, 0, canvas.width, canvas.height)
    }

    baseImage.onload = () => {
      if (!renderedTexture) {
        draw(baseImage)
      }
    }

    if (renderedTexture) {
      renderImage.onload = () => draw(renderImage)
      renderImage.src = renderedTexture
    }

    baseImage.src = uploadedImage
  }, [uploadedImage, renderedTexture])

  const handleFile = (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (loadEvent) => {
      setUploadedImage(loadEvent.target.result)
      setRenderedTexture(null)
      setRenderError('')
    }
    reader.readAsDataURL(file)
  }

  const handleReferenceFile = (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (loadEvent) => {
      setSelectedReference(loadEvent.target.result)
      setReferenceLabel(file.name || 'Custom reference')
      setRenderError('')
      setRenderedTexture(null)
    }
    reader.readAsDataURL(file)
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
                slate, broom finishes, and more. Upload a driveway photo, define the pour area, and
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
              Load a site photo, pick a reference driveway finish, and render a photoreal update
              that keeps everything else in the scene intact.
            </p>
            <div className="workspace-hint">
              <strong>Tip:</strong> Choose a clean reference photo with the exact finish you want to
              match.
            </div>
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
                <button
                  className="ghost-button"
                  type="button"
                  onClick={() => setUploadedImage('/sample-driveway.svg')}
                >
                  Use Sample Driveway
                </button>
              </div>
              <div className="upload-footer">
                <span className="pill">Unlimited points</span>
                <span className="pill">HD render export</span>
                <span className="pill">Client share link</span>
              </div>
            </div>

              <div className="renderer">
                <div className="renderer-header">
                  <div>
                    <h3>Live Render</h3>
                    <p>{statusMessage}</p>
                  </div>
                  <div className="finish-pill">Reference driveway</div>
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
              <div className="canvas-actions">
                <button
                  className="primary-button render-button"
                  type="button"
                  onClick={requestOpenAIRender}
                  disabled={isRendering}
                >
                  Render driveway
                </button>
              </div>
              {renderError ? <p className="render-error">{renderError}</p> : null}
              <div className="controls">
                <div className="control-group">
                  <h4>Reference driveway</h4>
                  <div className="reference-card active">
                    <div
                      className="reference-preview"
                      style={{ backgroundImage: `url(${selectedReference})` }}
                    />
                    <div>
                      <p className="finish-title">{referenceLabel}</p>
                      <p className="finish-description">
                        Select a driveway reference image to drive the render style.
                      </p>
                    </div>
                  </div>
                  <div className="reference-actions">
                    <label className="primary-button" htmlFor="reference-upload">
                      Upload Reference
                    </label>
                    <input
                      id="reference-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleReferenceFile}
                      hidden
                    />
                    <button
                      className="ghost-button"
                      type="button"
                      onClick={() => {
                        setSelectedReference(referenceImage)
                        setReferenceLabel('Reference Driveway')
                        setRenderedTexture(null)
                        setRenderError('')
                      }}
                    >
                      Use Sample Reference
                    </button>
                  </div>
                </div>

                <div className="control-group">
                  <h4>Render guidance</h4>
                  <p className="finish-description">
                    The AI keeps the uploaded photo intact and applies the reference driveway style
                    across the scene.
                  </p>
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
