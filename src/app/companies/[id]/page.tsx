import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import CompanyDetailClient from '@/components/CompanyDetailClient'
import CompanyActions from '@/components/CompanyActions'
import GenerationSidebar from '@/components/GenerationSidebar'

export default async function CompanyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
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

  // 最新の生成バッチの記事を取得
  const { data: latestGeneration } = await supabase
    .from('blog_generations')
    .select('id')
    .eq('company_id', id)
    .order('generated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  let blogs: any[] = []
  if (latestGeneration) {
    const { data } = await supabase
      .from('generated_blogs')
      .select('*')
      .eq('generation_id', latestGeneration.id)
      .order('id')
    blogs = data || []
  } else {
    // 旧データ（generation_id未設定）があれば表示
    const { data } = await supabase
      .from('generated_blogs')
      .select('*')
      .eq('company_id', id)
      .order('generated_at', { ascending: false })
      .limit(12)
    blogs = data || []
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-gray-400 hover:text-gray-600 transition-colors">
              ← 戻る
            </Link>
            <h1 className="text-xl font-bold text-gray-800">{company.name}</h1>
          </div>
          <CompanyActions companyId={company.id} />
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex gap-6">
          {/* 左サイドバー：生成履歴 */}
          <div className="w-44 flex-shrink-0">
            <GenerationSidebar companyId={id} />
          </div>

          {/* メインコンテンツ */}
          <div className="flex-1 min-w-0">
            {/* 企業情報 */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-700 mb-4">企業情報</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                {company.hp_url && (
                  <div>
                    <p className="text-gray-500 font-medium mb-1">企業HP</p>
                    <a href={company.hp_url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline truncate block">
                      {company.hp_url}
                    </a>
                  </div>
                )}
                {company.hearing_text && (
                  <div>
                    <p className="text-gray-500 font-medium mb-1">ヒアリングシート</p>
                    <p className="text-gray-700 line-clamp-2">{company.hearing_text.substring(0, 100)}...</p>
                  </div>
                )}
              </div>
              {company.construction_types && company.construction_types.length > 0 && (
                <div className="mt-4">
                  <p className="text-gray-500 font-medium mb-2">注力施工内容</p>
                  <div className="flex flex-wrap gap-2">
                    {company.construction_types.map((type: string, i: number) => (
                      <span key={i} className="bg-blue-50 text-blue-700 text-sm px-3 py-1.5 rounded-full font-medium">
                        {type}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <CompanyDetailClient company={company} initialBlogs={blogs} />
          </div>
        </div>
      </main>
    </div>
  )
}
