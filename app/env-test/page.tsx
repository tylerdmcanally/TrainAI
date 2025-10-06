'use client'

export default function EnvTestPage() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Environment Variables Test</h1>
      
      <div className="space-y-4">
        <div className="bg-gray-100 p-4 rounded">
          <h2 className="font-semibold">NEXT_PUBLIC_SUPABASE_URL</h2>
          <p className="text-sm break-all">
            {supabaseUrl ? `${supabaseUrl.substring(0, 30)}...` : '❌ MISSING'}
          </p>
        </div>
        
        <div className="bg-gray-100 p-4 rounded">
          <h2 className="font-semibold">NEXT_PUBLIC_SUPABASE_ANON_KEY</h2>
          <p className="text-sm break-all">
            {supabaseKey ? `${supabaseKey.substring(0, 20)}...` : '❌ MISSING'}
          </p>
        </div>
        
        <div className="bg-gray-100 p-4 rounded">
          <h2 className="font-semibold">Status</h2>
          <p>
            {supabaseUrl && supabaseKey ? '✅ Both variables present' : '❌ Missing variables'}
          </p>
        </div>
      </div>
    </div>
  )
}
