import { Card, Page, PageHead, Row, Stat, useLang, useT } from '../components/ui';
import { api, useAsync } from '../lib/api';
import { fmtCompact, fmtNum } from '../lib/format';
import { navigate } from '../lib/router';

export function EconomyPage() {
  const t = useT();
  const lang = useLang();
  const eco = useAsync(api.economy, []);

  if (eco.data === null) {
    return (
      <Page>
        <PageHead title={t('page.economy')} />
        <p className="sub">…</p>
      </Page>
    );
  }
  const e = eco.data;

  return (
    <Page>
      <PageHead title={t('page.economy')} sub={`${e.currency.code} · ${e.currency.name}`} />
      <div className="grid2">
        <Stat label={t('eco.supply')} value={`${fmtCompact(e.supplyDinar, lang)} Đ`} />
        <Stat label={t('eco.citizens')} value={fmtNum(e.citizens, lang)} />
        <Stat label={t('eco.purchases')} value={fmtNum(e.purchases, lang)} />
        <Stat label={t('eco.products')} value={fmtNum(e.products, lang)} />
        <Stat label={t('eco.ledger')} value={fmtNum(e.ledgerRows, lang)} />
        <Stat label={t('eco.stars')} value={fmtNum(e.starsInReserve, lang)} />
      </div>
      <Card>
        <Row title={t('eco.tax')} end={<strong>{fmtNum(e.taxPercent, lang)}%</strong>} />
        <Row title={t('page.nation')} end={<button type="button" className="linklike" onClick={() => navigate('/nation')}>→</button>} />
        <Row title={t('page.charter')} end={<button type="button" className="linklike" onClick={() => navigate('/charter')}>→</button>} />
      </Card>
    </Page>
  );
}
