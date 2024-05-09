export function LoadingSpinner() {
  return (
    <div className="h-full flex flex-col items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-gray-900 dark:border-gray-600 dark:border-t-gray-400" />
      <p className="mt-4 text-gray-500 dark:text-gray-400">Loading...</p>
    </div>
  )
}
