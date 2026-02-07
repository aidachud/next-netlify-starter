import fetch from 'node-fetch'

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '15mb',
    },
  },
}

const ZAI_BASE_URL = process.env.ZAI_BASE_URL || 'https://api.z.ai/api/paas/v4'
const ZAI_VISION_MODEL = process.env.ZAI_VISION_MODEL || 'glm-4.6v'
const ZAI_IMAGE_MODEL = process.env.ZAI_IMAGE_MODEL || 'glm-image-1'

const buildStylePrompt = (styleName) =>
  `Analyze this driveway finish for replication. Return STRICT JSON with: base_color (hex), warmth (0-1), texture_strength (0-1), mottling_scale (small/medium/large), joint_visibility (0-1), joint_spacing_m (number), border_present (true/false), border_type (exposed_aggregate/smooth/none), border_contrast (0-1). No extra text. Style name: ${styleName}.`

const buildTexturePrompt = (profile) =>
  `Top-down photorealistic concrete driveway texture. Base color: ${profile.base_color}, warmth: ${profile.warmth}. Smooth poured concrete with subtle mottling at ${profile.mottling_scale} scale, texture strength ${profile.texture_strength}. Faint saw-cut joints visible ${profile.joint_visibility}, spaced about ${profile.joint_spacing_m} meters. ${
    profile.border_present
      ? `Include a ${profile.border_type} border with contrast ${profile.border_contrast}.`
      : 'No border.'
  } Even lighting, no perspective, no objects, tileable texture.`

const parseJsonFromText = (text) => {
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch (error) {
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) return null
    try {
      return JSON.parse(match[0])
    } catch (parseError) {
      return null
    }
  }
}

const normalizeProfile = (profile) => ({
  base_color: profile?.base_color || '#c9d0d6',
  warmth: typeof profile?.warmth === 'number' ? profile.warmth : 0.5,
  texture_strength:
    typeof profile?.texture_strength === 'number' ? profile.texture_strength : 0.3,
  mottling_scale: profile?.mottling_scale || 'medium',
  joint_visibility:
    typeof profile?.joint_visibility === 'number' ? profile.joint_visibility : 0.4,
  joint_spacing_m:
    typeof profile?.joint_spacing_m === 'number' ? profile.joint_spacing_m : 2.0,
  border_present: Boolean(profile?.border_present),
  border_type: profile?.border_type || 'none',
  border_contrast:
    typeof profile?.border_contrast === 'number' ? profile.border_contrast : 0.25,
})

const handler = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!process.env.ZAI_API_KEY) {
    return res.status(501).json({ error: 'ZAI_API_KEY is not configured.' })
  }

  const { referenceStyleUrl, styleName, polygon } = req.body || {}

  if (!referenceStyleUrl) {
    return res.status(400).json({ error: 'referenceStyleUrl is required.' })
  }

  if (!Array.isArray(polygon) || polygon.length < 3) {
    return res.status(400).json({ error: 'polygon with at least 3 points is required.' })
  }

  try {
    const visionResponse = await fetch(`${ZAI_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.ZAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: ZAI_VISION_MODEL,
        temperature: 0.2,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: buildStylePrompt(styleName || 'Driveway style') },
              { type: 'image_url', image_url: { url: referenceStyleUrl } },
            ],
          },
        ],
      }),
    })

    const visionPayload = await visionResponse.json()
    if (!visionResponse.ok) {
      return res.status(visionResponse.status).json({
        error: visionPayload?.error?.message || visionPayload?.error || 'Z.ai style analysis failed.',
      })
    }

    const styleText = visionPayload?.choices?.[0]?.message?.content
    const rawProfile = parseJsonFromText(styleText)
    const styleProfile = normalizeProfile(rawProfile)

    const textureResponse = await fetch(`${ZAI_BASE_URL}/images/generations`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.ZAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: ZAI_IMAGE_MODEL,
        prompt: buildTexturePrompt(styleProfile),
        size: '1024x1024',
        n: 1,
      }),
    })

    const texturePayload = await textureResponse.json()

    if (!textureResponse.ok) {
      return res.status(textureResponse.status).json({
        error:
          texturePayload?.error?.message || texturePayload?.error || 'Z.ai texture generation failed.',
      })
    }

    const output = texturePayload?.data?.[0]
    const textureImage =
      output?.b64_json ? `data:image/png;base64,${output.b64_json}` : output?.url || null

    if (!textureImage) {
      return res.status(502).json({ error: 'Z.ai returned no texture image.' })
    }

    return res.status(200).json({ textureImage, styleProfile })
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Unexpected error.' })
  }
}

export default handler
