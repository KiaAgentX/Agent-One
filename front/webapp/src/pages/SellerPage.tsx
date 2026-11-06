import { Card, Page, PageHead, Row, Stat, useLang, useT } from '../components/ui';
import { api, useAsync } from '../lib/api';
import { fmtDin, fmtNum } from '../lib/format';
import { navigate } from '../lib/router';

export function SellerPage() {
  const t = useT();
  const lang = useLang();
  const products = useAsync(api.products, []);
  const sales = useAsync(api.sales, []);

  return (
    <Page>
      <PageHead title={t('page.seller')} />
      <div className="grid2">
        <Stat label={t('seller.products')} value={fmtNum(products.data?.length ?? 0, lang)} />
        <Stat label={t('sales.revenue')} value={sales.data === null ? '…' : fmtDin(sales.data.revenue30d, lang)} />
      </div>

      <Card onClick={() => navigate('/seller/new')}>
        <strong>＋ {t('seller.add')}</strong>
      </Card>
      <Card onClick={() => navigate('/sales')}>
        <strong>→ {t('page.sales')}</strong>
      </Card>
      <Card onClick={() => navigate('/crm')}>
        <strong>→ {t('page.crm')}</strong>
      </Card>

      <h2 className="sec-title">{t('seller.products')}</h2>
      <Card>
        {(products.data ?? []).slice(0, 5).map((p) => (
          <Row
            key={p.id}
            title={p.title[lang]}
            sub={`${p.seller[lang]} · ${fmtNum(p.salesCount, lang)} ${t('market.sales')}`}
            end={<span className="price">{fmtDin(p.price, lang)}</span>}
            onClick={() => navigate(`/product/${p.id}`)}
          />
        ))}
      </Card>
    </Page>
  );
}
