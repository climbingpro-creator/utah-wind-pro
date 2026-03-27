import { useState } from 'react'
import { ErrorBoundary, Modal } from '@utahwind/ui'

function WaterApp() {
  const [showModal, setShowModal] = useState(false)

  return (
    <div className="min-h-screen px-4 py-12">
      <div className="max-w-2xl mx-auto text-center space-y-8">
        <div className="space-y-3">
          <h1 className="text-5xl font-black tracking-tight bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400 bg-clip-text text-transparent">
            Utah Water & Glass
          </h1>
          <p className="text-lg text-slate-400 font-medium">
            Fishing, boating, paddling & glass conditions — powered by the UtahWind monorepo
          </p>
        </div>

        <div className="grid gap-4 text-left">
          <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-6 space-y-2">
            <h2 className="text-xl font-bold text-cyan-300">Workspace Packages</h2>
            <ul className="space-y-1 text-sm text-slate-300">
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <code className="text-emerald-400">@utahwind/ui</code> — Modal, ErrorBoundary, FactorBar, Sparkline
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <code className="text-emerald-400">@utahwind/database</code> — Supabase client
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <code className="text-emerald-400">@utahwind/config</code> — Shared ESLint config
              </li>
            </ul>
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="w-full py-3 px-6 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition-colors cursor-pointer"
          >
            Open Shared Modal Component
          </button>
        </div>

        <Modal isOpen={showModal} onClose={() => setShowModal(false)} label="Demo Modal">
          <div className="bg-slate-800 rounded-2xl border border-slate-700 p-8 max-w-md w-full space-y-4">
            <h2 className="text-2xl font-bold text-white">Shared Modal Works!</h2>
            <p className="text-slate-300 text-sm leading-relaxed">
              This modal is imported from <code className="text-cyan-400">@utahwind/ui</code> — 
              the same component used in the Wind app. Monorepo component sharing is live.
            </p>
            <button
              onClick={() => setShowModal(false)}
              className="w-full py-2.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium transition-colors"
            >
              Close
            </button>
          </div>
        </Modal>

        <p className="text-xs text-slate-600">
          Tailwind v4 · Vite · React 19 · Turborepo
        </p>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <ErrorBoundary name="Utah Water">
      <WaterApp />
    </ErrorBoundary>
  )
}
