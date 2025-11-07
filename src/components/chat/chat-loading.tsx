export default function ChatLoading() {
  return (
    <div className="flex items-center gap-1.5 text-xs">
      <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-gray-600 [animation-delay:-0.3s] dark:bg-white/60"></span>
      <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-gray-600 [animation-delay:-0.15s] dark:bg-white/60"></span>
      <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-gray-600 dark:bg-white/60"></span>
    </div>
  );
}
