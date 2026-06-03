import { NextRequest, NextResponse } from 'next/server'
import * as cheerio from 'cheerio'

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json()
    if (!url) return NextResponse.json({ error: 'URL required' }, { status: 400 })

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; BlogBot/1.0)',
      },
      signal: AbortSignal.timeout(10000),
    })

    const html = await response.text()
    const $ = cheerio.load(html)

    $('script, style, nav, footer, header, aside').remove()

    const text = $('body')
      .text()
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 3000)

    return NextResponse.json({ text })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message, text: '' }, { status: 200 })
  }
}
