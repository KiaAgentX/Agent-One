import { Badge, Card, Page, PageHead, useLang, useT } from '../components/ui';
import { ARTICLES } from './charterArticles';

export function CharterPage() {
  const t = useT();
  const lang = useLang();

  return (
    <Page>
      <PageHead title={t('page.charter')} sub={t('nation.articles')} />
      {ARTICLES.map((a) => (
        <Card key={a.id}>
          <strong>
            §{a.id} · {a.title[lang]}
          </strong>
          <p className="sub">{a.rule[lang]}</p>
        </Card>
      ))}
      <Card>
        <p className="sub">
          {t('charter.source')}: <code>docs/charter/</code> · <code>packages/nation</code> (charter 2.1.0 + ۱۰ ماده)
        </p>
        <Badge tone="info">AGI-main → docs/charter</Badge>
      </Card>
    </Page>
  );
}
