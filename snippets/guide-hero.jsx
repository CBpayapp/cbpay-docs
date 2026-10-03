export const GuideHero = ({ title, subtitle, children }) => {
  return (
    <div className="my-6 rounded-2xl border border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/20 px-6 py-5 text-base leading-7 text-gray-800 dark:text-zinc-100">
      {title ? <div className="text-xl font-semibold tracking-tight">{title}</div> : null}
      {subtitle ? <p className="mt-1 opacity-90">{subtitle}</p> : null}
      {!title && !subtitle ? children : null}
    </div>
  );
};
