# LilyPond Converter Microservice

Converts LilyPond (.ly) files to SVG sheet music.

## Deploy to Fly.io

```bash
# Install Fly CLI (if not already installed)
brew install flyctl

# Login
fly auth login

# Deploy (from this directory)
cd lilypond-server
fly launch    # First time: creates app, you can rename it
fly deploy    # Subsequent deploys

# Check status
fly status
fly logs
```

## API

### POST /convert

Converts LilyPond content to SVG.

**Request:**
```json
{
  "content": "\\relative c' { c4 d e f | g2 g }"
}
```

**Response:**
```json
{
  "success": true,
  "svgs": ["<svg>...</svg>"],
  "pageCount": 1
}
```

### GET /health

Health check endpoint.

## Local Testing

```bash
npm install
npm start
# Server runs on http://localhost:3001

# Test with curl:
curl -X POST http://localhost:3001/convert \
  -H "Content-Type: application/json" \
  -d '{"content": "\\relative c'"'"' { c4 d e f }"}'
```

## Update Your Vercel App

After deploying, update `LilypondViewer.tsx` to call:
```
https://lilypond-converter.fly.dev/convert
```

instead of `/api/lilypond-to-svg`.
