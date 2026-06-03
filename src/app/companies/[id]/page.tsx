import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import CompanyDetailClient from '@/components/CompanyDetailClient'

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

  const { data: blogs } = await supabase
    .from('generated_blogs')
    .select('*')
    .eq('company_id', id)
    .order('generated_at', { ascending: false })
    .limit(12)

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/dashboard" className="text-gray-400 hover:text-gray-600 transition-colors">
            ← 戻る
          </Link>
          <h1 className="text-xl font-bold text-gray-800">{company.name}</h1>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Company Info */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
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
                <p className="text-gray-700 line-clamp-3">{company.hearing_text.substring(0, 100)}...</p>
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

        <CompanyDetailClient company={company} initialBlogs={blogs || []} />
      </main>
    </div>
  )
}
