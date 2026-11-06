import { useEffect } from 'react';
import { useRoute } from './lib/router';
import { useSyncExternalStore } from 'react';
import { getLang, setLang, subscribeLang, t, toggleLang, type Lang } from './lib/i18n';
import { initTelegram, isTelegram, tgUser } from './lib/telegram';
import { StubPage } from './pages/StubPage';
import { TAB_PAGES } from './routes';
import { navigate } from './lib/router';

function useLang(): Lang {
  return useSyncExternalStore(subscribeLang, getLang, getLang);
}

export function App() {
  const { page } = useRoute();
  const lang = useLang();

  useEffect(() => {
    initTelegram();
    setLang(lang);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const user = tgUser();

  return (
    <div className="app">
      <header className="app-header">
        <div>
          <h2 className="brand">{t('app.title')}</h2>
          <p className="tagline">{t('app.tagline')}</p>
        </div>
        <button type="button" className="lang-btn" onClick={toggleLang}>
          {t('lang.switch')}
        </button>
      </header>

      {isTelegram() && user && (
        <p className="hello">
          {lang === 'fa' ? 'سلام' : 'Hi'}, {user.first_name ?? user.username ?? ''}!
        </p>
      )}

      <main className="app-main">
        <StubPage page={page} />
      </main>

      <nav className="tabbar" aria-label="main">
        {TAB_PAGES.map((p) => (
          <button
            key={p.id}
            type="button"
            className={page.id === p.id ? 'tab tab-active' : 'tab'}
            onClick={() => navigate(p.path)}
          >
            {t(`page.${p.id}`)}
          </button>
        ))}
      </nav>
    </div>
  );
}

export default App;
