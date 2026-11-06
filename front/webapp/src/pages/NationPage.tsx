import { Badge, Card, Page, PageHead, useLang, useT } from '../components/ui';
import { GENESIS_AUDIT, checkInvariant } from '@dropagentx/nation';
import { economyIndicators } from '../lib/demo';
import { ARTICLES } from './charterArticles';

/** The published genesis itemization — bilingual twin of nation's GENESIS_AUDIT. */
const ITEMIZATION = [
  { fa: 'خریدهای میراث بدون سطر دفتر (۹ × ۵۰)', en: 'heritage purchases without ledger rows (9 × 50 Đ)', dinar: -450 },
  { fa: 'اعتبار دستی مالک بدون سطر دفتر', en: 'manual owner credit without a ledger row', dinar: 387 },
] as const;

export function NationPage() {
  const t = useT();
  const lang = useLang();

  // Article 7 over the published books: Σbalances − Σledger − documented = 0
  // documented adjustments = −63 (the itemized, published gap) → invariant HOLDS.
  const report = checkInvariant(
    economyIndicators.supplyDinar,
    187_735,
    Number((GENESIS_AUDIT.itemization.reduce((acc, i) => acc + i.dinar, 0)).toFixed(0)),
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
        {ITEMIZATION.map((item, i) => (
          <p key={i} className="sub">
            {item[lang]} · {item.dinar} Đ
          </p>
        ))}
        <p className="sub" dir="ltr">
          Σ {GENESIS_AUDIT.balances} vs Σ {GENESIS_AUDIT.ledger} → {GENESIS_AUDIT.gap} Đ
        </p>
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
