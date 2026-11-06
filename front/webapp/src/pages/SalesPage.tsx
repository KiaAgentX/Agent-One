import { Card, Empty, Page, PageHead, Row, Stat, useLang, useT } from '../components/ui';
import { api, useAsync } from '../lib/api';
import { fmtDin, fmtNum } from '../lib/format';

export function SalesPage() {
  const t = useT();
  const lang = useLang();
  const sales = useAsync(api.sales, []);
  const orders = useAsync(api.orders, []);

  if (sales.data === null) {
    return (
      <Page>
        <PageHead title={t('page.sales')} />
        <Empty text={t('common.loading')} />
      </Page>
    );
  }
  const s = sales.data;
  const max = Math.max(...s.series);

  return (
    <Page>
      <PageHead title={t('page.sales')} />
      <div className="grid3">
        <Stat label={t('sales.revenue')} value={fmtDin(s.revenue30d, lang)} />
        <Stat label={t('sales.orders')} value={fmtNum(s.orders30d, lang)} />
        <Stat label={t('sales.avg')} value={fmtDin(s.avgOrder, lang)} />
      </div>

      <Card>
        <h2 className="sec-title">{t('sales.revenue')}</h2>
        <div className="bars" aria-hidden="true">
          {s.series.map((v, i) => (
            <div key={i} className="bar" style={{ blockSize: `${Math.round((v / max) * 64)}px` }} />
          ))}
        </div>
      </Card>

      <Card>
        <Row title={t('sales.top')} end={<span className="sub">{s.topProduct[lang]}</span>} />
      </Card>

      <h2 className="sec-title">{t('page.orders')}</h2>
      <Card>
        {(orders.data ?? []).filter((o) => o.role === 'seller').map((o) => (
          <Row key={o.id} title={o.productTitle[lang]} sub={o.counterpart[lang]} end={<span className="price">{fmtDin(o.gross, lang)}</span>} />
        ))}
      </Card>
    </Page>
  );
}
