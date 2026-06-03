import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import LogoutButton from '@/components/LogoutButton'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: companies } = await supabase
    .from('companies')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-800">ブログ自動生成アプリ</h1>
          <div className="flex items-center gap-4">
            <Link
              href="/companies/new"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              + 企業登録
            </Link>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-700">登録済み企業</h2>
          <p className="text-sm text-gray-500 mt-1">{companies?.length ?? 0}社登録済み</p>
        </div>

        {!companies || companies.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
            <div className="text-gray-400 text-5xl mb-4">🏢</div>
            <p className="text-gray-600 font-medium">まだ企業が登録されていません</p>
            <p className="text-gray-400 text-sm mt-1">右上の「企業登録」から追加してください</p>
            <Link
              href="/companies/new"
              className="inline-block mt-6 bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              企業を登録する
            </Link>
          </div>
        ) : (
          <div className="grid gap-4">
            {companies.map((company) => (
              <Link key={company.id} href={`/companies/${company.id}`}>
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md hover:border-blue-200 transition-all cursor-pointer">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800">{company.name}</h3>
                      {company.hp_url && (
                        <p className="text-sm text-blue-500 mt-1 truncate max-w-md">{company.hp_url}</p>
                      )}
                      {company.construction_types && company.construction_types.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3">
                          {company.construction_types.map((type: string, i: number) => (
                            <span key={i} className="bg-blue-50 text-blue-700 text-xs px-3 py-1 rounded-full font-medium">
                              {type}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="text-right text-xs text-gray-400">
                      <p>登録日</p>
                      <p>{new Date(company.created_at).toLocaleDateString('ja-JP')}</p>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
