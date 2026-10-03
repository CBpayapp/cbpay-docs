export const ErrorTable = ({ title, children }) => {
  return (
    <div className="my-5 overflow-hidden rounded-xl border border-gray-200 dark:border-zinc-700">
      <div className="border-b border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800/60 px-4 py-2 text-sm font-semibold text-gray-800 dark:text-zinc-100">
        {title}
      </div>
      <div className="px-4 py-2 text-sm">{children}</div>
    </div>
  );
};
