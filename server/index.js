// Tiny proxy that attaches the Groq API key server-side so it never ships to the
// browser. Deployed on Render; the frontend (on Vercel) calls it via
// VITE_API_BASE_URL. Mirrors the Vite dev proxy so paths are identical.

import express from 'express'
import cors from 'cors'

const app = express()
app.use(express.json({ limit: '1mb' }))

// Restrict to the frontend origin in prod (set CORS_ORIGIN), or allow all.
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }))

const GROQ_API_KEY = process.env.GROQ_API_KEY

app.get('/', (_req, res) => res.json({ ok: true, service: 'shopper-intent-proxy' }))

app.post('/api/groq/openai/v1/chat/completions', async (req, res) => {
  if (!GROQ_API_KEY) {
    return res.status(500).json({ error: { message: 'GROQ_API_KEY is not set on the server.' } })
  }
  try {
    const upstream = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify(req.body),
    })
    // Pass the body + status straight through so the client's error handling works.
    const text = await upstream.text()
    res.status(upstream.status).type('application/json').send(text)
  } catch (e) {
    res.status(502).json({ error: { message: `Upstream error: ${e.message}` } })
  }
})

const port = process.env.PORT || 8080
app.listen(port, () => console.log(`shopper-intent-proxy listening on :${port}`))
