# SCENEIT

**AI-Powered Photo Enhancement**

Transform any photo with AI. Modernize interiors, upgrade exteriors, or reimagine any scene.

![SCENEIT](https://img.shields.io/badge/SCENEIT-AI%20Photo%20Enhancement-8B5CF6)

## Features

- 📸 **Camera Capture** - Take photos directly from your phone
- 📤 **Upload** - Select images from your library
- ✨ **AI Enhancement** - Powered by Google Gemini
- 🎨 **Custom Styles** - Apply specific transformations
- 💾 **Download** - Save enhanced images
- 📱 **PWA Ready** - Install on any device

## Quick Start

### 1. Clone & Install

```bash
git clone <your-repo>
cd sceneit
npm install
```

### 2. Configure API Key

Copy the environment example and add your Google API key:

```bash
cp .env.example .env.local
```

Edit `.env.local`:
```
GOOGLE_API_KEY=your_api_key_here
```

Get your API key at: https://aistudio.google.com/apikey

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Deploy to Vercel

### One-Click Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/YOUR_REPO&env=GOOGLE_API_KEY&envDescription=Google%20AI%20API%20Key%20for%20image%20enhancement&envLink=https://aistudio.google.com/apikey)

### Manual Deploy

1. Push to GitHub
2. Import project in Vercel Dashboard
3. Add environment variable: `GOOGLE_API_KEY`
4. Deploy!

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Styling**: Tailwind CSS v4
- **AI**: Google Gemini (Image Generation)
- **Icons**: Lucide React
- **Deployment**: Vercel

## Usage Tips

### Quick Styles

Click any quick style button to apply common transformations:
- Modern luxury interior
- Warm cozy lighting
- Clean minimalist
- Bright and airy
- Professional real estate

### Custom Prompts

Click "Custom Style" to write your own enhancement prompt:
- "Make it look like a Mediterranean villa"
- "Add string lights and warm evening ambiance"
- "Convert to a modern Scandinavian design"

## API Rate Limits

The Google Gemini API has rate limits. For production use, consider:
- Implementing request queuing
- Adding user authentication
- Setting up usage monitoring

## License

MIT
