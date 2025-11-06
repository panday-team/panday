export default function ChatLoading() {
  return (
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
  );
}
