export const config = {
  api: {
    bodyParser: {
      sizeLimit: '15mb',
    },
  },
}

const LEONARDO_BASE_URL = process.env.LEONARDO_BASE_URL || 'https://cloud.leonardo.ai/api/rest/v1'

const buildRenderPrompt = (styleName) =>
  `Photorealistic concrete driveway finish based on reference ${styleName}. Match the color, smoothness, subtle mottling, and border detail. Preserve the surrounding environment and lighting.`

const decodeDataUrl = (dataUrl) => {
  if (!dataUrl) return null
  const match = dataUrl.match(/^data:(.+);base64,(.+)$/)
  if (!match) return null
  return Buffer.from(match[2], 'base64')
}

const extractGenerationId = (payload) =>
  payload?.sdGenerationJob?.generationId ||
  payload?.generationId ||
  payload?.job?.generationId ||
  payload?.data?.generationId ||
  null

const extractImageUrl = (payload) =>
  payload?.generations_by_pk?.generated_images?.[0]?.url ||
  payload?.generations_by_pk?.generated_images?.[0]?.imageUrl ||
  payload?.generated_images?.[0]?.url ||
  payload?.generated_images?.[0]?.imageUrl ||
  payload?.data?.generated_images?.[0]?.url ||
  null

const handler = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!process.env.LEONARDO_API_KEY) {
    return res.status(501).json({ error: 'LEONARDO_API_KEY is not configured.' })
  }

  const { siteImageUrl, maskData, referenceStyleUrl, styleName, polygon } = req.body || {}

  if (!siteImageUrl) {
    return res.status(400).json({ error: 'siteImageUrl is required.' })
  }

  if (!referenceStyleUrl) {
    return res.status(400).json({ error: 'referenceStyleUrl is required.' })
  }

  if (!Array.isArray(polygon) || polygon.length < 3) {
    return res.status(400).json({ error: 'polygon with at least 3 points is required.' })
  }

  try {
    const imageBuffer = decodeDataUrl(siteImageUrl)
    if (!imageBuffer) {
      return res.status(400).json({ error: 'siteImageUrl must be a data URL.' })
    }

    const formData = new FormData()
    formData.append('init_image', new Blob([imageBuffer]), 'driveway.png')
    formData.append('extension', 'png')

    const initResponse = await fetch(`${LEONARDO_BASE_URL}/init-image`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.LEONARDO_API_KEY}`,
      },
      body: formData,
    })

    const initPayload = await initResponse.json()
    if (!initResponse.ok) {
      return res.status(initResponse.status).json({
        error: initPayload?.error || initPayload?.message || 'Leonardo init image failed.',
      })
    }

    const initImageId =
      initPayload?.uploadInitImage?.id ||
      initPayload?.init_image_id ||
      initPayload?.data?.id ||
      null

    if (!initImageId) {
      return res.status(502).json({ error: 'Leonardo returned no init image id.' })
    }

    let maskInitImageId = null
    if (maskData) {
      const maskBuffer = decodeDataUrl(maskData)
      if (maskBuffer) {
        const maskForm = new FormData()
        maskForm.append('init_image', new Blob([maskBuffer]), 'mask.png')
        maskForm.append('extension', 'png')
        const maskResponse = await fetch(`${LEONARDO_BASE_URL}/init-image`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.LEONARDO_API_KEY}`,
          },
          body: maskForm,
        })
        const maskPayload = await maskResponse.json()
        maskInitImageId =
          maskPayload?.uploadInitImage?.id ||
          maskPayload?.init_image_id ||
          maskPayload?.data?.id ||
          null
      }
    }

    const generationPayloadBody = {
      prompt: buildRenderPrompt(styleName || 'driveway finish'),
      init_image_id: initImageId,
      init_strength: 0.35,
      num_images: 1,
      guidance_scale: 7,
    }

    if (maskInitImageId) {
      generationPayloadBody.mask_init_image_id = maskInitImageId
    }

    const generationResponse = await fetch(`${LEONARDO_BASE_URL}/generations`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.LEONARDO_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(generationPayloadBody),
    })

    const generationPayload = await generationResponse.json()
    if (!generationResponse.ok) {
      return res.status(generationResponse.status).json({
        error: generationPayload?.error || generationPayload?.message || 'Leonardo generation failed.',
      })
    }

    const generationId = extractGenerationId(generationPayload)
    if (!generationId) {
      return res.status(502).json({ error: 'Leonardo returned no generation id.' })
    }

    let textureImage = null
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const pollResponse = await fetch(`${LEONARDO_BASE_URL}/generations/${generationId}`, {
        headers: {
          Authorization: `Bearer ${process.env.LEONARDO_API_KEY}`,
        },
      })
      const pollPayload = await pollResponse.json()
      textureImage = extractImageUrl(pollPayload)
      if (textureImage) {
        break
      }
      await new Promise((resolve) => setTimeout(resolve, 2000))
    }

    if (!textureImage) {
      return res.status(502).json({ error: 'Leonardo render did not return an image.' })
    }

    return res.status(200).json({ textureImage })
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Unexpected error.' })
  }
}

export default handler
