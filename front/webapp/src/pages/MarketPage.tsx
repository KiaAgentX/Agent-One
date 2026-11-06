import { useMemo, useState } from 'react';
import { Badge, Card, Empty, Page, PageHead, useLang, useT } from '../components/ui';
import { api, useAsync } from '../lib/api';
import { fmtDin, fmtNum } from '../lib/format';
import { navigate } from '../lib/router';
import { PRODUCT_CATEGORIES, type ProductCategory } from '../lib/demo';

export function MarketPage() {
  const t = useT();
  const lang = useLang();
  const products = useAsync(api.products, []);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<ProductCategory | 'all'>('all');

  const filtered = useMemo(() => {
    const list = products.data ?? [];
    return list.filter(
      (p) =>
        (cat === 'all' || p.category === cat) &&
        (q.trim() === '' ||
          p.title[lang].toLowerCase().includes(q.toLowerCase()) ||
          p.seller[lang].toLowerCase().includes(q.toLowerCase())),
    );
  }, [products.data, q, cat, lang]);

  return (
    <Page>
      <PageHead title={t('page.market')} />
      <input
        className="input"
        placeholder={t('common.search')}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        data-testid="market-search"
      />
      <div className="chips">
        <button type="button" className={cat === 'all' ? 'chip chip-picked' : 'chip'} onClick={() => setCat('all')}>
          {t('common.all')}
        </button>
        {PRODUCT_CATEGORIES.map((c) => (
          <button key={c} type="button" className={cat === c ? 'chip chip-picked' : 'chip'} onClick={() => setCat(c)}>
            {t(`cat.${c}`)}
          </button>
        ))}
      </div>

      {products.data === null ? (
        <Empty text={t('common.loading')} />
      ) : filtered.length === 0 ? (
        <Empty text={t('common.empty')} />
      ) : (
        <div className="grid2">
          {filtered.map((p) => (
            <Card key={p.id} onClick={() => navigate(`/product/${p.id}`)}>
              <div className={`thumb thumb-${p.category}`} aria-hidden="true">
                {p.title[lang].slice(0, 2)}
              </div>
              <strong className="clamp2">{p.title[lang]}</strong>
              <span className="price">{fmtDin(p.price, lang)}</span>
              <span className="sub">
                {p.seller[lang]} · ★ {fmtNum(p.rating, lang)} · {fmtNum(p.salesCount, lang)} {t('market.sales')}
              </span>
              {p.escrow ? <Badge tone="ok">{t('status.escrow')}</Badge> : <Badge tone="muted">{t('product.direct')}</Badge>}
            </Card>
          ))}
        </div>
      )}
    </Page>
  );
}
