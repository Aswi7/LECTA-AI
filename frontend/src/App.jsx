function App() {
  return (
    <main className="min-h-screen bg-slate-100 px-6 py-16 text-slate-900">
      <div className="mx-auto flex max-w-3xl flex-col items-center rounded-3xl bg-white p-10 text-center shadow-xl ring-1 ring-slate-200">
        <span className="mb-4 rounded-full bg-emerald-100 px-4 py-1 text-sm font-semibold text-emerald-700">
          Tailwind v4 active
        </span>
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
          Tailwind is working in your React app
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-slate-600">
          Your frontend is now using Tailwind through the Vite plugin, so you
          can start building by adding utility classes directly in JSX.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <span className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white">
            npm run dev
          </span>
          <span className="rounded-full bg-blue-100 px-4 py-2 text-sm font-medium text-blue-700">
            Edit src/App.jsx
          </span>
          <span className="rounded-full bg-violet-100 px-4 py-2 text-sm font-medium text-violet-700">
            Build your UI
          </span>
        </div>
      </div>
    </main>
  )
}

export default App
