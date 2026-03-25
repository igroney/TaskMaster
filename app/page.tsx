export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
      <div className="card p-8 w-full max-w-sm text-center">
        <div className="text-5xl mb-4">⬡</div>
        <h1 className="text-2xl font-bold mb-2">OpsBoard</h1>
        <p className="text-sm text-[var(--muted)] mb-6">Task management across all your businesses</p>
        <div className="space-y-3">
          <a href="/login" className="btn-primary w-full block text-center">
            Sign In
          </a>
          <a href="/dashboard" className="btn-ghost w-full block text-center">
            Go to Dashboard
          </a>
        </div>
      </div>
    </div>
  )
}
