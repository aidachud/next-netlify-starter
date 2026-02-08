export const config = {
  api: {
    bodyParser: {
      sizeLimit: '15mb',
    },
  },
}

const buildRenderPrompt = (styleName, finishNotes, finishTone, finishStrength) => {
  const notes = finishNotes ? ` Finish notes: ${finishNotes}.` : ''
  const tone = finishTone ? ` Concrete tone: ${finishTone}.` : ''
  const strength =
    typeof finishStrength === 'number'
      ? ` Apply the finish strength at ${finishStrength}% while keeping it realistic.`
      : ''
  return `Photorealistic edit. Do NOT change the house, landscaping, sky, or any surrounding elements. Keep everything in the original photo the same; only add or replace the driveway with a finish in the style of ${styleName}. Match the reference color, smoothness, subtle mottling, joints, and border detail.${notes}${tone}${strength} Preserve perspective, shadows, and lighting.`
}

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

const extractResponseText = (payload) => {
  if (payload?.output_text) return payload.output_text
  const output = payload?.output
  if (!Array.isArray(output)) return null
  for (const item of output) {
    const content = item?.content
    if (!Array.isArray(content)) continue
    for (const part of content) {
      if (part?.type === 'output_text' && part?.text) {
        return part.text
      }
    }
  }
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

  const { siteImageUrl, referenceImageUrl, styleName, finishNotes, finishTone, finishStrength } =
    req.body || {}

  if (!siteImageUrl) {
    return res.status(400).json({ error: 'siteImageUrl is required.' })
  }

  try {
    const imageBuffer = decodeDataUrl(siteImageUrl)
    if (!imageBuffer) {
      return res.status(400).json({ error: 'siteImageUrl must be a data URL.' })
    }

    let referenceNotes = ''
    if (referenceImageUrl) {
      const visionResponse = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: process.env.OPENAI_VISION_MODEL || 'gpt-4.1-mini',
          input: [
            {
              role: 'user',
              content: [
                {
                  type: 'input_text',
                  text:
                    'Analyze the driveway finish in this reference image and describe it in 1-2 sentences for a rendering prompt. Focus on color tone, surface texture, joints, border, and any aggregate.',
                },
                { type: 'input_image', image_url: referenceImageUrl },
              ],
            },
          ],
        }),
      })

      const visionPayload = await visionResponse.json()
      if (!visionResponse.ok) {
        return res.status(visionResponse.status).json({
          error:
            visionPayload?.error?.message ||
            visionPayload?.error ||
            'OpenAI reference analysis failed.',
        })
      }

      referenceNotes = extractResponseText(visionPayload) || ''
    }

    const promptDetails = referenceNotes ? ` Reference details: ${referenceNotes}` : ''

    const formData = new FormData()
    formData.append('model', process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1')
    formData.append(
      'prompt',
      `${buildRenderPrompt(styleName || 'driveway finish', finishNotes, finishTone, finishStrength)}${promptDetails}`
    )
    formData.append('image', new Blob([imageBuffer], { type: 'image/png' }), 'driveway.png')

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
