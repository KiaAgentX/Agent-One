import { Card, Page, PageHead, useLang, useT } from '../components/ui';
import { faqs } from '../lib/demo';

export function HelpPage() {
  const t = useT();
  const lang = useLang();

  return (
    <Page>
      <PageHead title={t('page.help')} />

      <Card>
        <h2 className="sec-title">{t('help.bot')}</h2>
        <p className="sub" dir="ltr">{t('help.botBody')}</p>
      </Card>

      <h2 className="sec-title">{t('help.faq')}</h2>
      <Card>
        {faqs.items.map((f, i) => (
          <details key={i} className="faq">
            <summary>{f.q[lang]}</summary>
            <p className="sub">{f.a[lang]}</p>
          </details>
        ))}
      </Card>
    </Page>
  );
}
