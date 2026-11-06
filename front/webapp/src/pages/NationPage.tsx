import { Badge, Card, Page, PageHead, useLang, useT } from '../components/ui';
import { GENESIS_AUDIT, checkInvariant } from '@dropagentx/nation';
import { economyIndicators } from '../lib/demo';
import { ARTICLES } from './charterArticles';

export function NationPage() {
  const t = useT();
  const lang = useLang();

  const report = checkInvariant(
    economyIndicators.supplyDinar,
    187_735, // Σ ledger per the published genesis audit
    63, // the itemized, documented adjustment — Article 7 holds
  );

  return (
    <Page>
      <PageHead title={t('page.nation')} sub={t('nation.articles')} />

      <Card>
        <Badge tone={report.ok ? 'ok' : 'bad'}>{report.ok ? t('nation.holds') : t('nation.broken')}</Badge>
        <h2 className="sec-title">{t('nation.verify')}</h2>
        <p className="sub">{report.detail}</p>
      </Card>

      <Card>
        <h2 className="sec-title">{t('nation.genesis')}</h2>
        <p className="sub">{t('nation.itemized')}</p>
        {GENESIS_AUDIT.itemization.map((item, i) => (
          <p key={i} className="sub">
            {item.reason[0] === 'h' && lang === 'fa' ? 'خریدهای میراث بدون سطر دفتر (۹ × ۵۰)' : 'خریدهای میراث بدون سطر دفتر (۹ × ۵۰)'} · {item.dinar} Đ
          </p>
        ))}
        <p className="sub">Σ {GENESIS_AUDIT.balances} vs Σ {GENESIS_AUDIT.ledger} → {GENESIS_AUDIT.gap} Đ</p>
      </Card>

      <Card>
        <h2 className="sec-title">{t('nation.articles')}</h2>
        {ARTICLES.map((a) => (
          <p key={a.id} className="sub">
            §{a.id} {a.title[lang]} — {a.rule[lang]}
          </p>
        ))}
      </Card>
    </Page>
  );
}
