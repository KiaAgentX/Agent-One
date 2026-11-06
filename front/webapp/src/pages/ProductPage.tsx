import { useState } from 'react';
import { Badge, Btn, Card, Empty, Page, PageHead, useLang, useT } from '../components/ui';
import { api, useAsync } from '../lib/api';
import { fmtDin, fmtNum } from '../lib/format';
import { navigate, useRoute } from '../lib/router';

export function ProductPage() {
  const t = useT();
  const lang = useLang();
  const { params } = useRoute();
  const product = useAsync(() => api.product(params.id ?? ''), [params.id]);
  const [qty, setQty] = useState(1);

  if (product.data === null && !product.loading) {
    return (
      <Page>
        <PageHead title={t('page.product')} onBack={() => navigate('/market')} />
        <Empty text={t('common.empty')} />
      </Page>
    );
  }
  if (product.data === null) {
    return (
      <Page>
        <PageHead title={t('page.product')} onBack={() => navigate('/market')} />
        <Empty text={t('common.loading')} />
      </Page>
    );
  }
  const p = product.data;

  return (
    <Page>
      <PageHead title={p.title[lang]} onBack={() => navigate('/market')} />
      <div className={`thumb thumb-lg thumb-${p.category}`} aria-hidden="true">
        {p.title[lang].slice(0, 2)}
      </div>
      <Card>
        <span className="price price-lg">{fmtDin(p.price * qty, lang)}</span>
        <span className="sub">
          {t('product.by')}: {p.seller[lang]} · ★ {fmtNum(p.rating, lang)} · {fmtNum(p.salesCount, lang)} {t('market.sales')}
        </span>
        <p className="sub">{p.desc[lang]}</p>
        {p.escrow ? <Badge tone="ok">{t('status.escrow')}</Badge> : <Badge tone="muted">{t('product.direct')}</Badge>}
      </Card>

      <Card>
        <span className="sub">{t('product.qty')}</span>
        <div className="stepper">
          <Btn variant="ghost" onClick={() => setQty((n) => Math.max(1, n - 1))}>−</Btn>
          <strong data-testid="qty">{fmtNum(qty, lang)}</strong>
          <Btn variant="ghost" onClick={() => setQty((n) => Math.min(9, n + 1))}>+</Btn>
        </div>
      </Card>

      <Btn onClick={() => navigate(`/checkout?product=${p.id}&qty=${qty}`)}>{p.escrow ? t('product.buySecure') : t('product.direct')}</Btn>
    </Page>
  );
}
