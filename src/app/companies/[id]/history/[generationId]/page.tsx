import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import GenerationSidebar from '@/components/GenerationSidebar'
import HistoryArticles from '@/components/HistoryArticles'
import CompanyActions from '@/components/CompanyActions'

export default async function HistoryPage({
  params,
}: {
  params: Promise<{ id: string; generationId: string }>
}) {
  const { id, generationId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: company } = await supabase
    .from('companies')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!company) notFound()

  const { data: generation } = await supabase
    .from('blog_generations')
    .select('*')
    .eq('id', generationId)
    .eq('company_id', id)
    .single()

  if (!generation) notFound()

  const { data: blogs } = await supabase
    .from('generated_blogs')
    .select('*')
    .eq('generation_id', generationId)
    .order('id')

  const genDate = new Date(generation.generated_at)

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href={`/companies/${id}`} className="text-gray-400 hover:text-gray-600 transition-colors">
              ← 戻る
            </Link>
            <h1 className="text-xl font-bold text-gray-800">{company.name}</h1>
          </div>
          <CompanyActions companyId={id} />
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex gap-6">
          {/* 左サイドバー：生成履歴 */}
          <div className="w-44 flex-shrink-0">
            <GenerationSidebar companyId={id} currentGenerationId={generationId} />
          </div>

          {/* メインコンテンツ */}
          <div className="flex-1 min-w-0">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-6 py-4 mb-6 flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400">生成日時</p>
                <p className="text-base font-semibold text-gray-800 mt-0.5">
                  {genDate.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })}
                  　{genDate.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <span className="bg-blue-50 text-blue-700 text-sm px-3 py-1.5 rounded-full font-medium">
                {blogs?.length ?? 0}本
              </span>
            </div>

            <HistoryArticles blogs={blogs || []} companyName={company.name} />
          </div>
        </div>
      </main>
    </div>
  )
}
