export default function ErrorMessage({ message, onRetry }) {
  return (
    <div className="bg-red-50 border-l-4 border-red-400 p-6 rounded-lg">
      <div className="flex items-center">
        <div className="text-red-400 text-2xl mr-3">⚠️</div>
        <div>
          <h3 className="text-red-800 font-semibold">Error</h3>
          <p className="text-red-700 mt-1">{message}</p>
        </div>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Try Again
        </button>
      )}
    </div>
  );
}
