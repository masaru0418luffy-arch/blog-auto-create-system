'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Props {
  companyId: string
}

export default function CompanyActions({ companyId }: Props) {
  const [showConfirm, setShowConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleDelete = async () => {
    setDeleting(true)
    await supabase.from('generated_blogs').delete().eq('company_id', companyId)
    await supabase.from('companies').delete().eq('id', companyId)
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <Link
          href={`/companies/${companyId}/edit`}
          className="border border-gray-300 text-gray-600 text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
        >
          編集
        </Link>
        <button
          onClick={() => setShowConfirm(true)}
          className="border border-red-200 text-red-500 text-sm font-medium px-4 py-2 rounded-lg hover:bg-red-50 transition-colors"
        >
          削除
        </button>
      </div>

      {/* 削除確認ダイアログ */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-sm mx-4">
            <h2 className="text-lg font-bold text-gray-800 mb-2">企業を削除しますか？</h2>
            <p className="text-sm text-gray-500 mb-6">
              この企業と生成済みのブログ記事がすべて削除されます。この操作は元に戻せません。
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                disabled={deleting}
                className="flex-1 border border-gray-300 text-gray-600 font-medium py-2.5 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                キャンセル
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 bg-red-500 text-white font-medium py-2.5 rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {deleting ? '削除中...' : '削除する'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
