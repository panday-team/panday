export default function ChatLoading() {
  return (
<<<<<<< HEAD
    <div className="flex items-center gap-1.5 text-xs">
      <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-gray-600 [animation-delay:-0.3s] dark:bg-white/60"></span>
      <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-gray-600 [animation-delay:-0.15s] dark:bg-white/60"></span>
      <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-gray-600 dark:bg-white/60"></span>
    </div>
=======
    <ul className="flex w-[60px] justify-evenly">
      <li
        className="animate-chat-bounce h-3 w-3 list-none rounded-full bg-white"
        aria-hidden="true"
      />
      <li
        className="animate-chat-bounce h-3 w-3 list-none rounded-full bg-white [animation-delay:0.3s]"
        aria-hidden="true"
      />
      <li
        className="animate-chat-bounce h-3 w-3 list-none rounded-full bg-white [animation-delay:0.6s]"
        aria-hidden="true"
      />
    </ul>
>>>>>>> 1218528 (add: automatic scrolling on message send)
  );
}
