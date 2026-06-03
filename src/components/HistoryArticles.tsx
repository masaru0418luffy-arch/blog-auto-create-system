'use client'

import { useState } from 'react'

interface Blog {
  id: string
  title: string
  body: string
  category: string
}

interface Props {
  blogs: Blog[]
}

export default function HistoryArticles({ blogs }: Props) {
  const [copied, setCopied] = useState<string | null>(null)

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
      <div className="flex justify-end mb-4">
        <button
          onClick={copyAll}
          className="bg-gray-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-900 transition-colors"
        >
          {copied === 'all' ? '✓ コピー済み' : '全てコピー'}
        </button>
      </div>

      <div className="grid gap-4">
        {blogs.map((blog, index) => (
          <div key={blog.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-white bg-blue-600 rounded-full w-6 h-6 flex items-center justify-center">
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

            <div className="mt-4 pt-4 border-t border-gray-50 flex justify-between">
              <p className="text-xs text-gray-300">画像：未設定（後日追加）</p>
              <p className="text-xs text-gray-400">{blog.body.length}文字</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
