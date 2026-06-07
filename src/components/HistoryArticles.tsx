'use client'

import { useState } from 'react'
import Image from 'next/image'

interface Blog {
  id: string
  title: string
  body: string
  category: string
  image_url?: string | null
}

interface Props {
  blogs: Blog[]
  companyName: string
}

export default function HistoryArticles({ blogs, companyName }: Props) {
  const [copied, setCopied] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)
  const [exportStatus, setExportStatus] = useState<'idle' | 'success' | 'error'>('idle')

  const exportToSheets = async () => {
    setExporting(true)
    setExportStatus('idle')
    try {
      const res = await fetch('/api/export-to-sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blogs, companyName }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'エクスポート失敗')
      setExportStatus('success')
    } catch {
      setExportStatus('error')
    } finally {
      setExporting(false)
      setTimeout(() => setExportStatus('idle'), 3000)
    }
  }

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  const copyAll = async () => {
    const allText = blogs
      .map((b, i) => `【記事${i + 1}】\n${b.title}\n\n${b.body}`)
      .join('\n\n' + '─'.repeat(40) + '\n\n')
    await navigator.clipboard.writeText(allText)
    setCopied('all')
    setTimeout(() => setCopied(null), 2000)
  }

  if (blogs.length === 0) {
    return <p className="text-gray-400 text-sm text-center py-8">記事が見つかりません</p>
  }

  return (
    <div>
      <div className="flex justify-end gap-2 mb-4">
        <button
          onClick={exportToSheets}
          disabled={exporting}
          className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
        >
          {exporting
            ? '書き出し中...'
            : exportStatus === 'success'
            ? '✓ 書き出し完了'
            : exportStatus === 'error'
            ? '✗ 失敗'
            : 'スプレッドシートへ置換'}
        </button>
        <button
          onClick={copyAll}
          className="bg-gray-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-900 transition-colors"
        >
          {copied === 'all' ? '✓ コピー済み' : '全てコピー'}
        </button>
      </div>

      <div className="grid gap-4">
        {blogs.map((blog, index) => (
          <div key={blog.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {blog.image_url ? (
              <div className="relative w-full h-52">
                <Image
                  src={blog.image_url}
                  alt={blog.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 800px"
                />
              </div>
            ) : (
              <div className="w-full h-16 bg-gray-50 flex items-center justify-center border-b border-gray-100">
                <span className="text-xs text-gray-300">画像なし</span>
              </div>
            )}

            <div className="p-6">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-white bg-blue-600 rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0">
                    {index + 1}
                  </span>
                  <span className="bg-blue-50 text-blue-700 text-xs px-3 py-1 rounded-full font-medium">
                    {blog.category}
                  </span>
                </div>
                <button
                  onClick={() => copyToClipboard(`${blog.title}\n\n${blog.body}`, blog.id)}
                  className="text-xs text-gray-500 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  {copied === blog.id ? '✓ コピー済み' : 'コピー'}
                </button>
              </div>

              <h3 className="font-bold text-gray-800 text-base mb-3">{blog.title}</h3>
              <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line">{blog.body}</p>

              <div className="mt-4 pt-4 border-t border-gray-50 flex justify-end">
                <p className="text-xs text-gray-400">{blog.body.length}文字</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
