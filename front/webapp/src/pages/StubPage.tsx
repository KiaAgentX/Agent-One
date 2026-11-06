import { useSyncExternalStore } from 'react';
import { getLang, subscribeLang, t } from '../lib/i18n';
import type { PageDef } from '../routes';
import { PAGES, GROUPS } from '../routes';
import { navigate } from '../lib/router';

/**
 * StubPage — skeleton renderer for all 30 pages. Each stub declares exactly
 * which merged module will feed it (zero-loss trace, RULEBOOK Law 9-B) and
 * is replaced page-by-page in Step 5 (full UI).
 */

function useLang() {
  return useSyncExternalStore(subscribeLang, getLang, getLang);
}

export function StubPage({ page }: { page: PageDef }) {
  const lang = useLang();
  const siblings = PAGES.filter((p) => p.group === page.group && p.id !== page.id);

  return (
    <section className="stub" aria-labelledby="stub-title">
      <h1 id="stub-title">{t(`page.${page.id}`)}</h1>
      <p className="stub-note">{t('app.stubNote')}</p>
      <code className="stub-source">{page.source}</code>
      {page.command && <p className="stub-cmd">↔ {page.command}</p>}
      <p className="stub-lang">
        {lang === 'fa' ? 'فارسی' : 'English'} · {t(`group.${page.group}`)}
      </p>

      {siblings.length > 0 && (
        <nav className="stub-links" aria-label={t('nav.more')}>
          {siblings.map((p) => (
            <button key={p.id} type="button" onClick={() => navigate(p.path)}>
              {t(`page.${p.id}`)}
            </button>
          ))}
        </nav>
      )}

      <div className="stub-groups">
        {GROUPS.map((g) => (
          <span key={g} className={`chip chip-${g}`}>
            {t(`group.${g}`)}
          </span>
        ))}
      </div>
    </section>
  );
}
