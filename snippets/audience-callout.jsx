export const AudienceCallout = ({ children }) => {
  return (
    <div className="my-5 rounded-r-xl border border-gray-200 dark:border-zinc-700 border-l-4 border-l-amber-400 dark:border-l-amber-500 bg-gray-50 dark:bg-zinc-800/50 px-4 py-3 text-sm text-gray-700 dark:text-zinc-300">
      {children}
    </div>
  );
};
