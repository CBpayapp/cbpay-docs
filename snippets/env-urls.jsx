export const EnvUrls = ({ lang = "en" }) => {
  const T = {
    en: {
      test: "Test",
      live: "Live",
      hint: "Same API on both environments — build against test first, then go live by swapping the base URL and the key.",
      guide: "Environments and testing",
      href: "/en/environment-testing",
    },
    es: {
      test: "Test",
      live: "Live",
      hint: "La misma API en ambos ambientes — construye primero contra test y pasa a live cambiando la URL base y la key.",
      guide: "Entorno y pruebas",
      href: "/es/environment-testing",
    },
    zh: {
      test: "Test",
      live: "Live",
      hint: "两个环境的 API 完全一致——先在 test 环境构建，再通过切换基础 URL 和密钥上线。",
      guide: "环境与测试",
      href: "/zh/environment-testing",
    },
  };
  const t = T[lang] || T.en;
  const row = (label, url, keyPattern, badgeCls) => (
    <div className="flex flex-wrap items-center gap-2 px-3 py-2">
      <span
        className={
          "rounded px-1.5 py-0.5 text-xs font-semibold uppercase tracking-wide " +
          badgeCls
        }
      >
        {label}
      </span>
      <code className="text-xs">{url}</code>
      <span className="text-xs text-gray-400 dark:text-zinc-500">·</span>
      <code className="text-xs">{keyPattern}</code>
    </div>
  );
  return (
    <div className="my-4 rounded-xl border border-gray-200 dark:border-zinc-700 divide-y divide-gray-200 dark:divide-zinc-700 text-sm not-prose">
      {row(
        t.test,
        "https://cryptobank.qbank.cl/platform",
        "pk_test_...",
        "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
      )}
      {row(
        t.live,
        "https://api.qbank.cl/platform",
        "pk_...",
        "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
      )}
      <p className="px-3 py-2 text-xs text-gray-500 dark:text-zinc-400 m-0">
        {t.hint} <a href={t.href}>{t.guide} →</a>
      </p>
    </div>
  );
};
