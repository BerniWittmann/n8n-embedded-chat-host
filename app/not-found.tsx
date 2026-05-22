export default function NotFound() {
  return (
    <main className="h-full w-full flex items-center justify-center px-6 bg-[var(--nord0)] text-[var(--nord6)]">
      <div className="flex flex-col items-center text-center max-w-xl">
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-20 h-20 sm:w-24 sm:h-24 text-[#ebcb8b] mb-6"
        >
          <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
        <h1 className="text-7xl sm:text-8xl font-bold tracking-tight text-[var(--nord6)] mb-4">
          404
        </h1>
        <p className="text-2xl sm:text-3xl font-semibold text-[var(--nord6)] mb-3">
          This chat does not exist.
        </p>
        <p className="text-base sm:text-lg text-[var(--nord4)]">
          Check the URL or contact whoever shared this link with you.
        </p>
      </div>
    </main>
  );
}
