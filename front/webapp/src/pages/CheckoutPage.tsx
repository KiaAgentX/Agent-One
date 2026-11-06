import { useState } from 'react';
import { Badge, Btn, Card, Empty, Page, PageHead, Row, useLang, useT } from '../components/ui';
import { api, useAsync } from '../lib/api';
import { fmtDin } from '../lib/format';
import { navigate, useRoute } from '../lib/router';
import { taxSplitOf } from '../lib/demo';

export function CheckoutPage() {
  const t = useT();
  const lang = useLang();
  const { params } = useRoute();
  const productId = (params.product ?? params.id ?? 'p1').split('?')[0]!;
  const qty = Number((params.qty ?? '1').split('?')[0]!) || 1;
  const product = useAsync(() => api.product(productId), [productId]);
  const [done, setDone] = useState<string | null>(null);

  if (product.data === null) {
    return (
      <Page>
        <PageHead title={t('page.checkout')} onBack={() => navigate('/market')} />
        <Empty text={t('common.loading')} />
      </Page>
    );
  }
  const p = product.data;
  const gross = p.price * qty;
  const split = taxSplitOf(gross);

  return (
    <Page>
      <PageHead title={t('page.checkout')} onBack={() => navigate(`/product/${p.id}`)} />
      {done !== null ? (
        <Card>
          <strong>{t('checkout.success')}</strong>
          <Badge tone="ok">{done}</Badge>
          <Btn onClick={() => navigate(`/order/${done}`)}>{t('page.order')}</Btn>
        </Card>
      ) : (
        <>
          <Card>
            <h2 className="sec-title">{t('checkout.summary')}</h2>
            <Row title={p.title[lang]} sub={`${t('product.qty')}: ${qty}`} end={<span className="price">{fmtDin(gross, lang)}</span>} />
            <Row title={t('order.treasury')} sub={`${split.percent}%`} end={<span>{fmtDin(split.treasury, lang)}</span>} />
            <Row title={t('order.sellerShare')} end={<span>{fmtDin(split.seller, lang)}</span>} />
          </Card>
          <Card>
            <p className="sub">{t('checkout.escrowNote')}</p>
          </Card>
          <Btn
            onClick={() => {
              setDone(`o-${Date.now()}`);
            }}
          >
            {t('checkout.pay')}
          </Btn>
        </>
      )}
    </Page>
  );
}
