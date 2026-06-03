import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

interface Props {
  companyId: string
  currentGenerationId?: string
}

export default async function GenerationSidebar({ companyId, currentGenerationId }: Props) {
  const supabase = await createClient()

  const { data: generations } = await supabase
    .from('blog_generations')
    .select('id, generated_at')
    .eq('company_id', companyId)
    .order('generated_at', { ascending: false })

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sticky top-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-3 pb-3 border-b border-gray-100">
        生成履歴
      </h3>

      {!generations || generations.length === 0 ? (
        <p className="text-xs text-gray-400 text-center py-4">
          まだ生成履歴が<br />ありません
        </p>
      ) : (
        <div className="space-y-1">
          {generations.map((gen) => {
            const date = new Date(gen.generated_at)
            const isActive = gen.id === currentGenerationId
            return (
              <Link
                key={gen.id}
                href={`/companies/${companyId}/history/${gen.id}`}
                className={`block px-3 py-2.5 rounded-xl text-xs transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <p className="font-semibold">
                  {date.toLocaleDateString('ja-JP', { month: 'long', day: 'numeric' })}
                </p>
                <p className={`mt-0.5 ${isActive ? 'text-blue-100' : 'text-gray-400'}`}>
                  {date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
