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
  const [loadingImageIds, setLoadingImageIds] = useState<Set<string>>(new Set())
  const [imageErrors, setImageErrors] = useState<Record<string, string>>({})
  const [error, setError] = useState('')
  const [copied, setCopied] = useState<string | null>(null)
  const router = useRouter()

  const generateImageForBlog = async (blog: Blog) => {
    setLoadingImageIds(prev => new Set(prev).add(blog.id))
    setImageErrors(prev => ({ ...prev, [blog.id]: '' }))
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000)
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
        signal: controller.signal,
      })
      clearTimeout(timeoutId)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '生成に失敗しました')
      if (data.imageUrl) {
        setBlogs(prev =>
          prev.map(b => b.id === blog.id ? { ...b, image_url: data.imageUrl } : b)
        )
      }
    } catch (err: unknown) {
      clearTimeout(timeoutId)
      const message = err instanceof Error
        ? (err.name === 'AbortError' ? 'タイムアウトしました。再試行してください。' : err.message)
        : '画像生成に失敗しました'
      setImageErrors(prev => ({ ...prev, [blog.id]: message }))
    } finally {
      setLoadingImageIds(prev => {
        const next = new Set(prev)
        next.delete(blog.id)
        return next
      })
    }
  }

  const handleGenerate = async () => {
    setGenerating(true)
    setError('')
    setImageErrors({})

    try {
      const res = await fetch('/api/generate-blogs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId: company.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'ブログ生成に失敗しました')

      const newBlogs: Blog[] = data.blogs
      setBlogs(newBlogs)
      router.refresh()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'ブログ生成に失敗しました'
      setError(message)
    } finally {
      setGenerating(false)
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

  const imageGeneratingCount = loadingImageIds.size

  return (
    <>
      {/* Generate Button */}
      <div className="text-center mb-8">
        <button
          onClick={handleGenerate}
          disabled={generating}
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
        {imageGeneratingCount > 0 && (
          <p className="text-sm text-purple-600 mt-3 flex items-center justify-center gap-2">
            <span className="animate-spin inline-block">⟳</span>
            FLUX (fal.ai) で画像を生成中...（約15〜20秒）
          </p>
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
            <div className="flex gap-2">
              <button
                onClick={copyAll}
                className="bg-gray-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-900 transition-colors"
              >
                {copied === 'all' ? '✓ コピー済み' : '全てコピー'}
              </button>
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="border border-gray-300 text-gray-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                再生成
              </button>
            </div>
          </div>

          <div className="grid gap-4">
            {blogs.map((blog, index) => {
              const isImageLoading = loadingImageIds.has(blog.id)
              return (
                <div key={blog.id || index} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  {/* 画像エリア */}
                  {blog.image_url && !isImageLoading ? (
                    <div className="relative w-full h-52 group">
                      <Image
                        src={blog.image_url}
                        alt={blog.title}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, 800px"
                      />
                      {/* ホバー時に再生成ボタンを表示 */}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
                        <button
                          onClick={() => generateImageForBlog(blog)}
                          disabled={isImageLoading}
                          className="opacity-0 group-hover:opacity-100 transition-opacity bg-white text-gray-800 text-xs font-medium px-4 py-2 rounded-lg shadow-lg hover:bg-gray-100"
                        >
                          🔄 画像を再生成
                        </button>
                      </div>
                    </div>
                  ) : isImageLoading ? (
                    <div className="w-full h-52 bg-purple-50 flex flex-col items-center justify-center gap-2 border-b border-purple-100">
                      <span className="animate-spin text-2xl inline-block text-purple-400">⟳</span>
                      <p className="text-sm text-purple-500 font-medium">FLUX (fal.ai) で画像を生成中...</p>
                      <p className="text-xs text-purple-300">約15秒かかります</p>
                    </div>
                  ) : (
                    <div className="w-full h-32 bg-gray-50 flex flex-col items-center justify-center gap-2 border-b border-gray-100 px-4">
                      {imageErrors[blog.id] ? (
                        <>
                          <p className="text-xs text-red-500 text-center">エラー: {imageErrors[blog.id]}</p>
                          <button
                            onClick={() => generateImageForBlog(blog)}
                            className="text-xs text-purple-600 border border-purple-200 px-3 py-1.5 rounded-lg hover:bg-purple-50 transition-colors"
                          >
                            🔄 再試行する
                          </button>
                        </>
                      ) : (
                        <>
                          <p className="text-xs text-gray-400">画像が生成されていません</p>
                          <button
                            onClick={() => generateImageForBlog(blog)}
                            className="text-xs text-purple-600 border border-purple-200 px-3 py-1.5 rounded-lg hover:bg-purple-50 transition-colors"
                          >
                            🔄 画像を生成する
                          </button>
                        </>
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
                      <div className="flex items-center gap-2">
                        {/* 画像生成済みの場合は再生成ボタンを常時表示 */}
                        {blog.image_url && !isImageLoading && (
                          <button
                            onClick={() => generateImageForBlog(blog)}
                            className="text-xs text-purple-500 border border-purple-200 px-3 py-1.5 rounded-lg hover:bg-purple-50 transition-colors"
                          >
                            🔄 画像を再生成
                          </button>
                        )}
                        <button
                          onClick={() => copyToClipboard(`${blog.title}\n\n${blog.body}`, blog.id || String(index))}
                          className="text-xs text-gray-500 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          {copied === (blog.id || String(index)) ? '✓ コピー済み' : 'コピー'}
                        </button>
                      </div>
                    </div>

                    <h3 className="font-bold text-gray-800 text-base mb-3">{blog.title}</h3>
                    <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line">{blog.body}</p>

                    <div className="mt-4 pt-4 border-t border-gray-50 flex justify-end">
                      <p className="text-xs text-gray-400">{blog.body.length}文字</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </>
  )
}
