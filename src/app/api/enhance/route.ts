import { NextRequest, NextResponse } from 'next/server'

// Vercel serverless function config
export const maxDuration = 60 // seconds (requires Pro plan for >10s)
export const dynamic = 'force-dynamic'

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || ''

const MODERNIZE_PROMPT = `
You are performing a top-tier luxury redesign of this real estate photo as if the project has been re-executed by a world-class, highest-end interior designer AND architect who specialize exclusively in $10M+ ultra-luxury residences (think: architectural digest-level work, private client, no budget constraints, museum-level detailing).

PRIMARY MISSION: Transform the space into the highest tier of modern luxury design while preserving the room's exact structure and photography conditions. The finished image MUST look significantly nicer, more expensive, more refined, and more professionally designed than the original—without looking artificial, over-styled, or generically "staged."

ABSOLUTE NON-NEGOTIABLE CONSTRAINTS (MUST NOT CHANGE):
- Keep the EXACT SAME image dimensions, framing, and resolution.
- Keep the EXACT SAME camera angle, lens perspective, and vantage point.
- Keep the EXACT SAME architecture, wall positions, openings, ceiling height, and structural layout.
- Keep the EXACT SAME spatial configuration (nothing moved that changes room geometry).
- Do NOT add new doors/windows, remove doors/windows, change room boundaries, or alter structural elements.
- The result must look like the same room photographed from the same spot—only redesigned to ultra-luxury.

DESIGN STANDARD: This must appear indistinguishable from a $10M+ home professionally designed by an elite architect/interior designer team and photographed for a luxury publication. Every surface, edge, junction, hardware selection, and lighting choice should feel intentional, bespoke, and cohesive.

CORE PRINCIPLE: Upgrade EVERYTHING—materials, finishes, fixtures, hardware, lighting, furnishings, styling—while maintaining impeccable restraint and taste. No "cheap luxury cues," no random glam. Quiet luxury. Architectural clarity. Cohesive palette. Perfect execution.

REDESIGN REQUIREMENTS (DO ALL OF THESE, CONSISTENTLY):

1) ARCHITECTURAL FINISH UPGRADE (WITHOUT CHANGING ARCHITECTURE)
- Walls: Upgrade to flawless high-end finishes (plaster, refined paint, designer wallcovering) appropriate to the room.
- Trim: Add or refine premium trim language (thin reveals, elegant baseboards/casing, subtle crown if appropriate), but do not change the room geometry.
- Ceilings: Elevate with luxury detailing (coffered/beamed/architectural trim language) ONLY if it fits the existing style and does not alter perceived room height unnaturally.
- Transitions: Ensure all material transitions are clean, premium, and architecturally correct (no awkward seams).

2) FLOORS & STONEWORK
- Flooring must be upgraded to premium wide-plank hardwood, natural stone, or top-tier tile appropriate to the room's function.
- If stone is present anywhere (counters, surrounds, backsplashes), use book-matched marble/quartzite or equally premium natural materials with realistic veining and correct scale.

3) FIXTURES, HARDWARE, AND "SMALL DETAILS" (EVERY SINGLE ONE)
Upgrade every visible "touch point" to designer-grade:
- Door hardware: brushed brass / unlacquered brass / matte black (tastefully chosen and consistent).
- Cabinet hardware: designer pulls/knobs scaled properly; consistent finish family.
- Plumbing fixtures: Waterworks / Kallista / Dornbracht-level sophistication.
- Lighting: replace all basic fixtures with elegant statement pieces + architectural lighting strategy.
- Switches/outlets: premium, flush, or designer plates; no cheap plastic plates.
- Vents/registers/grilles: refined, minimal, and consistent with the luxury language.
- Hinges, rails, tracks: upgraded and harmonious (nothing builder-basic remains).

4) LIGHTING DESIGN (THIS IS CRITICAL)
The lighting must feel like an architect planned it:
- Layered lighting: ambient + accent + decorative.
- Warm, controlled color temperature; soft highlights; no harsh glare.
- Add subtle architectural lighting where appropriate (cove glow, picture lights, under-cabinet lighting, or recessed strategy) WITHOUT changing ceiling structure.
- Ensure all lighting appears physically plausible and consistent with shadows and reflections.

5) FURNITURE, SOFT GOODS, AND SCALE
Replace furnishings with contemporary, high-end pieces that fit the room proportionally:
- Sofas/chairs: refined silhouettes; premium upholstery; no bulky mass-market shapes.
- Tables: luxury materials (walnut, marble, stone, metal accents) with correct scale.
- Rugs: natural fiber or silk; appropriately sized; elevated texture; crisp edges.
- Window treatments: custom drapery / roman shades / designer blinds with perfect hang and believable fabric.
- Bedding (if applicable): hotel-grade linens, layered textures, tailored and pristine.

6) COLOR, PALETTE, AND MATERIAL HARMONY
- Curate a cohesive, restrained luxury palette: neutrals with depth, subtle contrast, intentional accents.
- Use material harmony: wood tone temperature, metal finishes, stone veining, textile textures must all coordinate.
- Avoid trendy, loud, or cheap-looking combinations.

7) ART, ACCESSORIES, AND STYLING (CURATED, NOT CLUTTERED)
- Wall art: properly scaled, high-end, positioned correctly; no generic prints.
- Decor objects: curated designer accessories (books, vessels, sculptural objects) with restraint.
- Greenery: mature, architectural plant choices in designer planters (not tiny or artificial-looking).
- Mirrors: statement mirror if appropriate; elegant frame; correct reflection behavior.
- Styling must feel "wealthy and intentional," not staged or busy.

FUNCTIONAL INTEGRITY (MUST MAINTAIN):
- A kitchen remains a kitchen; bedroom remains a bedroom; living room remains a living room.
- Do NOT convert room type or add features that change how the room is used.

QUALITY BAR: WHAT "MUST" BE TRUE IN THE FINAL IMAGE
- The redesign must look materially expensive and architecturally coherent.
- Everything should feel bespoke, intentional, and professionally executed.
- It must look cleaner, calmer, richer, and more elevated than the original.
- No visible cheap elements remain.
- The final result MUST look much nicer than the original—this is not optional.

POSITIVES (DO THESE)
- Do elevate the room into "quiet luxury" with exceptional material authenticity.
- Do ensure perfect proportions, scaling, and placement of furnishings and decor.
- Do ensure lighting feels designed, warm, and editorial.
- Do ensure finishes feel real (grain, veining, reflections, shadow behavior).
- Do ensure the space looks like it was redesigned by an architect + top interior designer team.

NEGATIVES (DO NOT DO THESE)
- Do NOT change the room layout, architecture, or camera angle.
- Do NOT distort geometry or alter the perceived dimensions.
- Do NOT use obvious AI artifacts, painterly textures, or unrealistic reflections.
- Do NOT over-style, over-clutter, or add random decorative noise.
- Do NOT use cheap "luxury signals" (gaudy chandeliers, tacky glam, random gold everywhere).
- Do NOT introduce mismatched finishes (mixed metals without intention).
- Do NOT create generic staging that looks like a furniture catalog.
- Do NOT add people, text, logos, watermarks, or signage.

FINAL INSTRUCTION: Return only the transformed image of the same room from the same viewpoint—now executed at the highest level of luxury design, as if completed by the most elite designer and architect in the world.
`

export async function POST(request: NextRequest) {
  try {
    const { image, prompt } = await request.json()

    if (!image) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 })
    }

    if (!GOOGLE_API_KEY) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
    }

    // Extract base64 data from data URL
    const base64Match = image.match(/^data:image\/(\w+);base64,(.+)$/)
    if (!base64Match) {
      return NextResponse.json({ error: 'Invalid image format' }, { status: 400 })
    }

    const mimeType = `image/${base64Match[1]}`
    const base64Data = base64Match[2]

    // Use custom prompt if provided, otherwise use the full modernize prompt
    const enhancementPrompt = prompt
      ? `${MODERNIZE_PROMPT}\n\nADDITIONAL USER INSTRUCTIONS: ${prompt}`
      : MODERNIZE_PROMPT

    // Call nano-banana-pro-preview (same model as listings viewer)
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/nano-banana-pro-preview:generateContent?key=${GOOGLE_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: enhancementPrompt },
                {
                  inlineData: {
                    mimeType,
                    data: base64Data
                  }
                }
              ]
            }
          ],
          generationConfig: {
            responseModalities: ['TEXT', 'IMAGE']
          }
        })
      }
    )

    if (!response.ok) {
      const errorData = await response.text()
      console.error('Gemini API error:', errorData)
      return NextResponse.json(
        { error: 'Enhancement service unavailable. Check API key and quota.' },
        { status: 502 }
      )
    }

    const result = await response.json()

    // Extract the generated image from the response
    const candidates = result.candidates || []
    if (!candidates.length) {
      return NextResponse.json(
        { error: 'No enhancement generated' },
        { status: 500 }
      )
    }

    const parts = candidates[0].content?.parts || []
    const imagePart = parts.find((p: { inlineData?: { mimeType: string; data: string } }) => p.inlineData)

    if (!imagePart?.inlineData) {
      const textPart = parts.find((p: { text?: string }) => p.text)
      return NextResponse.json(
        { error: textPart?.text || 'No image in response' },
        { status: 500 }
      )
    }

    const enhancedImage = `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`

    return NextResponse.json({ enhanced: enhancedImage })
  } catch (error) {
    console.error('Enhancement error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Enhancement failed' },
      { status: 500 }
    )
  }
}
