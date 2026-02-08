import Head from 'next/head'
import { useEffect, useRef, useState } from 'react'

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
        <title>Driveway Render Studio</title>
        <meta
          name="description"
          content="Render driveway designs from a reference finish in a single, focused workspace."
        />
      </Head>
      <div className="page studio-page">
        <header className="studio-header">
          <div>
            <p className="studio-eyebrow">Driveway Render Studio</p>
            <h1>Render a driveway finish from your reference image.</h1>
            <p className="studio-subtitle">
              Upload a site photo, select a reference driveway finish, and generate a photoreal
              render while keeping everything else intact.
            </p>
          </div>
          <div className="studio-status">
            <span className={`status-pill ${isRendering ? 'active' : ''}`}>{statusMessage}</span>
          </div>
        </header>

        <main className="studio-shell">
          <section className="studio-panel">
            <div className="upload-card">
              <div className="upload-dropzone">
                <div className="upload-icon" />
                <div>
                  <p className="upload-title">Upload site photo</p>
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
                  className="ghost-button light"
                  type="button"
                  onClick={() => setUploadedImage('/sample-driveway.svg')}
                >
                  Use Sample
                </button>
              </div>
            </div>

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
                    Choose the driveway finish you want the AI to match.
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
                  className="ghost-button light"
                  type="button"
                  onClick={() => {
                    setSelectedReference(referenceImage)
                    setReferenceLabel('Reference Driveway')
                    setRenderedTexture(null)
                    setRenderError('')
                  }}
                >
                  Use Sample
                </button>
              </div>
            </div>

            <div className="render-actions">
              <button
                className="primary-button render-button"
                type="button"
                onClick={requestOpenAIRender}
                disabled={isRendering}
              >
                Render driveway
              </button>
              {renderError ? <p className="render-error">{renderError}</p> : null}
            </div>
          </section>

          <section className="studio-preview">
            <div className="renderer">
              <div className="renderer-header">
                <div>
                  <h3>Live Render</h3>
                  <p>{statusMessage}</p>
                </div>
                <div className="finish-pill">Reference render</div>
              </div>
              <div className="canvas-frame">
                {hasImage ? (
                  <canvas ref={canvasRef} className="render-canvas" />
                ) : (
                  <div className="canvas-placeholder">
                    <p>Load a driveway photo to see the render.</p>
                  </div>
                )}
              </div>
            </div>
          </section>
        </main>
      </div>
    </>
  )
}
