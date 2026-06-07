import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import path from 'path'

interface Blog {
  id: string
  title: string
  body: string
  category: string
  image_url?: string | null
}

export async function POST(req: NextRequest) {
  try {
    const { blogs, companyName } = await req.json() as { blogs: Blog[]; companyName: string }

    const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID
    if (!spreadsheetId) {
      return NextResponse.json({ error: 'GOOGLE_SPREADSHEET_ID が設定されていません' }, { status: 500 })
    }

    let auth
    if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
      const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON)
      auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      })
    } else {
      const keyFilePath = path.join(process.cwd(), 'credentials', 'google-service-account.json')
      auth = new google.auth.GoogleAuth({
        keyFile: keyFilePath,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      })
    }

    const sheets = google.sheets({ version: 'v4', auth })

    // シート名: YYYY-MM-DD HH-MM_会社名
    const now = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}-${pad(now.getMinutes())}`
    const sheetName = `${dateStr}_${companyName}`.slice(0, 100)

    // 新しいシートを作成
    const addSheetRes = await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [{ addSheet: { properties: { title: sheetName } } }],
      },
    })

    const newSheetId = addSheetRes.data.replies?.[0]?.addSheet?.properties?.sheetId

    // 行の高さ・列幅・テキスト折り返しを設定
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          // 画像行(row1): 200px
          {
            updateDimensionProperties: {
              range: { sheetId: newSheetId, dimension: 'ROWS', startIndex: 0, endIndex: 1 },
              properties: { pixelSize: 200 },
              fields: 'pixelSize',
            },
          },
          // タイトル行(row2): 40px
          {
            updateDimensionProperties: {
              range: { sheetId: newSheetId, dimension: 'ROWS', startIndex: 1, endIndex: 2 },
              properties: { pixelSize: 40 },
              fields: 'pixelSize',
            },
          },
          // 本文行(row3): 200px
          {
            updateDimensionProperties: {
              range: { sheetId: newSheetId, dimension: 'ROWS', startIndex: 2, endIndex: 3 },
              properties: { pixelSize: 200 },
              fields: 'pixelSize',
            },
          },
          // 保存リンク行(row4): 30px
          {
            updateDimensionProperties: {
              range: { sheetId: newSheetId, dimension: 'ROWS', startIndex: 3, endIndex: 4 },
              properties: { pixelSize: 30 },
              fields: 'pixelSize',
            },
          },
          // 列幅: 250px
          {
            updateDimensionProperties: {
              range: { sheetId: newSheetId, dimension: 'COLUMNS', startIndex: 0, endIndex: blogs.length },
              properties: { pixelSize: 250 },
              fields: 'pixelSize',
            },
          },
          // タイトル・本文: テキスト折り返し + 上揃え
          {
            repeatCell: {
              range: {
                sheetId: newSheetId,
                startRowIndex: 1,
                endRowIndex: 3,
                startColumnIndex: 0,
                endColumnIndex: blogs.length,
              },
              cell: {
                userEnteredFormat: {
                  wrapStrategy: 'WRAP',
                  verticalAlignment: 'TOP',
                },
              },
              fields: 'userEnteredFormat(wrapStrategy,verticalAlignment)',
            },
          },
        ],
      },
    })

    // タイトル・本文を書き込み
    const titleRow = blogs.map(b => b.title)
    const bodyRow = blogs.map(b => b.body)

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `'${sheetName}'!A2`,
      valueInputOption: 'RAW',
      requestBody: {
        values: [titleRow, bodyRow],
      },
    })

    // 行1: 画像表示, 行2: タイトル（values.updateで上書き）, 行4: 保存リンク
    const imageRow = blogs.map(b => b.image_url ? `=IMAGE("${b.image_url}")` : '')
    const linkRow = blogs.map(b => b.image_url ? `=HYPERLINK("${b.image_url}", "📥 画像を保存")` : '')

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `'${sheetName}'!A1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [imageRow] },
    })

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `'${sheetName}'!A4`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [linkRow] },
    })

    return NextResponse.json({ success: true, sheetName })
  } catch (error: unknown) {
    console.error('Export to sheets error:', error)
    const message = error instanceof Error ? error.message : 'エクスポートに失敗しました'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
