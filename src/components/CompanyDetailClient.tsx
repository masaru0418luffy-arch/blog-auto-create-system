'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

interface Blog {
  id: string
  title: string
  body: string
  category: string
  generated_at: string
  image_url?: string | null
}

interface Company {
  id: string
  name: string
  hp_url?: string
  hp_content?: string
  hearing_text?: string
  construction_types?: string[]
}

interface Props {
  company: Company
  initialBlogs: Blog[]
}

export default function CompanyDetailClient({ company, initialBlogs }: Props) {
  const [blogs, setBlogs] = useState<Blog[]>(initialBlogs)
  const [generating, setGenerating] = useState(false)
  const [imageGenerating, setImageGenerating] = useState(false)
  const [imageProgress, setImageProgress] = useState(0)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState<string | null>(null)
  const router = useRouter()

  const handleGenerate = async () => {
    setGenerating(true)
    setError('')

    try {
      const res = await fetch('/api/generate-blogs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId: company.id }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'ブログ生成に失敗しました')

      setBlogs(data.blogs)
      router.refresh()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'ブログ生成に失敗しました'
      setError(message)
    } finally {
      setGenerating(false)
    }
  }

  const handleGenerateImages = async () => {
    setImageGenerating(true)
    setImageProgress(0)
    setError('')

    for (let i = 0; i < blogs.length; i++) {
      const blog = blogs[i]
      try {
        const res = await fetch('/api/generate-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            blogId: blog.id,
            title: blog.title,
            category: blog.category,
            companyId: company.id,
          }),
        })

        const data = await res.json()
        if (data.imageUrl) {
          setBlogs(prev =>
            prev.map(b => b.id === blog.id ? { ...b, image_url: data.imageUrl } : b)
          )
        }
      } catch {
        // 個別の失敗は無視して次へ進む
      }
      setImageProgress(i + 1)
    }

    setImageGenerating(false)
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

  const hasImages = blogs.some(b => b.image_url)

  return (
    <>
      {/* Generate Button */}
      <div className="text-center mb-8">
        <button
          onClick={handleGenerate}
          disabled={generating || imageGenerating}
          className="bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold px-12 py-4 rounded-xl text-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 active:scale-95"
        >
          {generating ? (
            <span className="flex items-center gap-3">
              <span className="animate-spin inline-block">⟳</span>
              ブログ文章を生成中...（1〜2分かかります）
            </span>
          ) : (
            'ブログ文章を生成する（12記事）'
          )}
        </button>
        {generating && (
          <p className="text-sm text-gray-500 mt-3">GPT-4oが12本の記事を生成しています。しばらくお待ちください。</p>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 mb-6">
          {error}
        </div>
      )}

      {/* Blog Results */}
      {blogs.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <h2 className="text-lg font-semibold text-gray-700">生成された記事（{blogs.length}本）</h2>
            <div className="flex gap-2 flex-wrap">
              {/* Image Generation Button */}
              {!hasImages && !imageGenerating && (
                <button
                  onClick={handleGenerateImages}
                  disabled={generating}
                  className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors disabled:opacity-50"
                >
                  🎨 DALL-E 3で画像を生成
                </button>
              )}
              {imageGenerating && (
                <div className="flex items-center gap-2 bg-purple-50 border border-purple-200 text-purple-700 text-sm px-4 py-2 rounded-lg">
                  <span className="animate-spin inline-block">⟳</span>
                  画像生成中... {imageProgress}/{blogs.length}枚
                </div>
              )}
              {hasImages && !imageGenerating && (
                <button
                  onClick={handleGenerateImages}
                  disabled={generating}
                  className="border border-purple-300 text-purple-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-50 transition-colors disabled:opacity-50"
                >
                  🎨 画像を再生成
                </button>
              )}
              <button
                onClick={copyAll}
                className="bg-gray-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-900 transition-colors"
              >
                {copied === 'all' ? '✓ コピー済み' : '全てコピー'}
              </button>
              <button
                onClick={handleGenerate}
                disabled={generating || imageGenerating}
                className="border border-gray-300 text-gray-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                再生成
              </button>
            </div>
          </div>

          <div className="grid gap-4">
            {blogs.map((blog, index) => (
              <div key={blog.id || index} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {/* Blog Image */}
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
                  <div className="w-full h-28 bg-gray-50 flex items-center justify-center border-b border-gray-100">
                    {imageGenerating && imageProgress <= index ? (
                      <span className="text-sm text-purple-400 flex items-center gap-2">
                        <span className="animate-spin inline-block">⟳</span>
                        画像生成待ち...
                      </span>
                    ) : (
                      <span className="text-sm text-gray-300">画像：未設定（後日追加）</span>
                    )}
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
                      onClick={() => copyToClipboard(`${blog.title}\n\n${blog.body}`, blog.id || String(index))}
                      className="text-xs text-gray-500 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors flex-shrink-0"
                    >
                      {copied === (blog.id || String(index)) ? '✓ コピー済み' : 'コピー'}
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
      )}
    </>
  )
}
