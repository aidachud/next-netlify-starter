export const config = {
  api: {
    bodyParser: {
      sizeLimit: '15mb',
    },
  },
}

const ZAI_ENDPOINT = process.env.ZAI_API_BASE || 'https://api.z.ai/v1/images/edits'

const handler = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!process.env.ZAI_API_KEY) {
    return res.status(501).json({ error: 'ZAI_API_KEY is not configured.' })
  }

  const { imageData, maskData, prompt, size } = req.body || {}

  if (!imageData || !maskData) {
    return res.status(400).json({ error: 'Image and mask data are required.' })
  }

  try {
    const response = await fetch(ZAI_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.ZAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        image: imageData,
        mask: maskData,
        size,
      }),
    })

    const payload = await response.json()

    if (!response.ok) {
      return res
        .status(response.status)
        .json({ error: payload?.error?.message || payload?.error || 'Z.ai render failed.' })
    }

    const output = payload?.data?.[0]
    const image =
      output?.b64_json ? `data:image/png;base64,${output.b64_json}` : output?.url || null

    if (!image) {
      return res.status(502).json({ error: 'Z.ai returned no image.' })
    }

    return res.status(200).json({ image })
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Unexpected error.' })
  }
}

export default handler
