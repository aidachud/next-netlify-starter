export const config = {
  api: {
    bodyParser: {
      sizeLimit: '15mb',
    },
  },
}

const buildRenderPrompt = (styleName) =>
  `Photorealistic concrete driveway finish based on reference ${styleName}. Match the color, smoothness, subtle mottling, and border detail. Preserve the surrounding environment and lighting.`

const decodeDataUrl = (dataUrl) => {
  if (!dataUrl) return null
  const match = dataUrl.match(/^data:(.+);base64,(.+)$/)
  if (!match) return null
  return Buffer.from(match[2], 'base64')
}

const extractOpenAIImage = (payload) => {
  const image = payload?.data?.[0]
  if (!image) return null
  if (image.url) return image.url
  if (image.b64_json) return `data:image/png;base64,${image.b64_json}`
  return null
}

const handler = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(501).json({ error: 'OPENAI_API_KEY is not configured.' })
  }

  const { siteImageUrl, maskData, styleName, polygon } = req.body || {}

  if (!siteImageUrl) {
    return res.status(400).json({ error: 'siteImageUrl is required.' })
  }

  if (!maskData) {
    return res.status(400).json({ error: 'maskData is required.' })
  }

  if (!Array.isArray(polygon) || polygon.length < 3) {
    return res.status(400).json({ error: 'polygon with at least 3 points is required.' })
  }

  try {
    const imageBuffer = decodeDataUrl(siteImageUrl)
    if (!imageBuffer) {
      return res.status(400).json({ error: 'siteImageUrl must be a data URL.' })
    }

    const maskBuffer = decodeDataUrl(maskData)
    if (!maskBuffer) {
      return res.status(400).json({ error: 'maskData must be a data URL.' })
    }

    const formData = new FormData()
    formData.append('model', process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1')
    formData.append('prompt', buildRenderPrompt(styleName || 'driveway finish'))
    formData.append('image', new Blob([imageBuffer], { type: 'image/png' }), 'driveway.png')
    formData.append('mask', new Blob([maskBuffer], { type: 'image/png' }), 'mask.png')

    const editResponse = await fetch('https://api.openai.com/v1/images/edits', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: formData,
    })

    const editPayload = await editResponse.json()
    if (!editResponse.ok) {
      return res.status(editResponse.status).json({
        error: editPayload?.error?.message || editPayload?.error || 'OpenAI render failed.',
      })
    }

    const textureImage = extractOpenAIImage(editPayload)
    if (!textureImage) {
      return res.status(502).json({ error: 'OpenAI render did not return an image.' })
    }

    return res.status(200).json({ textureImage })
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Unexpected error.' })
  }
}

export default handler
