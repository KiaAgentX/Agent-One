import { Card, Page, PageHead, Row, useLang, useT } from '../components/ui';
import { LANGS, setLang } from '../lib/i18n';

export function SettingsPage() {
  const t = useT();
  const lang = useLang();

  return (
    <Page>
      <PageHead title={t('page.settings')} />
      <Card>
        <h2 className="sec-title">{t('settings.language')}</h2>
        <div className="chips">
          {LANGS.map((l) => (
            <button
              key={l}
              type="button"
              className={lang === l ? 'chip chip-picked' : 'chip'}
              onClick={() => setLang(l)}
            >
              {l === 'fa' ? 'فارسی' : 'English'}
            </button>
          ))}
        </div>
      </Card>
      <Card>
        <Row title={t('settings.about')} end={<span className="sub">{t('app.title')}</span>} />
        <Row title={t('settings.version')} end={<span className="sub" dir="ltr">v3.4.0-unified</span>} />
        <Row title={t('page.charter')} end={<span className="sub">§1–10 ✓</span>} />
      </Card>
    </Page>
  );
}
