'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function NewCompanyPage() {
  const [name, setName] = useState('')
  const [hpUrl, setHpUrl] = useState('')
  const [constructionInput, setConstructionInput] = useState('')
  const [constructionTypes, setConstructionTypes] = useState<string[]>([])
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const supabase = createClient()

  const addConstructionType = () => {
    const trimmed = constructionInput.trim()
    if (trimmed && !constructionTypes.includes(trimmed)) {
      setConstructionTypes([...constructionTypes, trimmed])
      setConstructionInput('')
    }
  }

  const removeConstructionType = (index: number) => {
    setConstructionTypes(constructionTypes.filter((_, i) => i !== index))
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addConstructionType()
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('企業名は必須です')
      return
    }

    setLoading(true)
    setError('')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('認証エラー')

      let hpContent = ''
      let hearingFileUrl = ''
      let hearingText = ''

      // Scrape HP
      if (hpUrl.trim()) {
        setStatus('企業HPを取得中...')
        try {
          const res = await fetch('/api/scrape', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: hpUrl }),
          })
          const data = await res.json()
          if (data.text) hpContent = data.text
        } catch {
          console.warn('HP scraping failed')
        }
      }

      // Upload and parse PDF
      if (file) {
        setStatus('ヒアリングシートを処理中...')
        const formData = new FormData()
        formData.append('file', file)
        formData.append('userId', user.id)

        const res = await fetch('/api/parse-pdf', {
          method: 'POST',
          body: formData,
        })
        const data = await res.json()
        if (data.text) hearingText = data.text
        if (data.fileUrl) hearingFileUrl = data.fileUrl
      }

      setStatus('企業情報を保存中...')
      const { error: dbError } = await supabase.from('companies').insert({
        user_id: user.id,
        name: name.trim(),
        hp_url: hpUrl.trim() || null,
        hp_content: hpContent || null,
        hearing_file_url: hearingFileUrl || null,
        hearing_text: hearingText || null,
        construction_types: constructionTypes,
      })

      if (dbError) throw dbError

      router.push('/dashboard')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '登録に失敗しました'
      setError(message)
      setLoading(false)
      setStatus('')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/dashboard" className="text-gray-400 hover:text-gray-600 transition-colors">
            ← 戻る
          </Link>
          <h1 className="text-xl font-bold text-gray-800">企業登録</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-6">
          {/* Company Name */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              企業名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="例：株式会社〇〇工務店"
              required
            />
          </div>

          {/* HP URL */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">企業HP URL</label>
            <input
              type="url"
              value={hpUrl}
              onChange={(e) => setHpUrl(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="https://example.com"
            />
            <p className="text-xs text-gray-400 mt-1">入力すると自動でページ内容を取得します</p>
          </div>

          {/* Hearing Sheet */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">ヒアリングシート（PDF）</label>
            <div
              className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-400 transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              {file ? (
                <div className="text-sm text-gray-700">
                  <p className="font-medium">{file.name}</p>
                  <p className="text-gray-400 mt-1">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
              ) : (
                <div className="text-gray-400">
                  <p className="text-2xl mb-2">📄</p>
                  <p className="text-sm">クリックしてPDFをアップロード</p>
                </div>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="hidden"
            />
          </div>

          {/* Construction Types */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">増やしたい施工内容</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={constructionInput}
                onChange={(e) => setConstructionInput(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1 border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="例：外壁塗装"
              />
              <button
                type="button"
                onClick={addConstructionType}
                className="bg-blue-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                追加
              </button>
            </div>
            {constructionTypes.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {constructionTypes.map((type, i) => (
                  <span key={i} className="flex items-center gap-1 bg-blue-50 text-blue-700 text-sm px-3 py-1.5 rounded-full font-medium">
                    {type}
                    <button
                      type="button"
                      onClick={() => removeConstructionType(i)}
                      className="text-blue-400 hover:text-blue-700 transition-colors ml-1"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
              {error}
            </div>
          )}

          {status && (
            <div className="bg-blue-50 border border-blue-200 text-blue-700 text-sm rounded-lg px-4 py-3">
              {status}
            </div>
          )}

          <div className="flex gap-4 pt-2">
            <Link
              href="/dashboard"
              className="flex-1 text-center border border-gray-300 text-gray-600 font-medium py-3 rounded-lg hover:bg-gray-50 transition-colors"
            >
              キャンセル
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 text-white font-medium py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? status || '登録中...' : '登録する'}
            </button>
          </div>
        </form>
      </main>
    </div>
  )
}
