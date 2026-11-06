import { useState } from 'react';
import { Badge, Btn, Card, Empty, Page, PageHead, Row, Timeline, useLang, useT } from '../components/ui';
import { api, useAsync } from '../lib/api';
import { fmtDin } from '../lib/format';
import { navigate, useRoute } from '../lib/router';
import { taxSplitOf } from '../lib/demo';
import type { Order } from '../lib/demo';

const STEPS: readonly Order['status'][] = ['paid', 'escrow', 'delivered', 'released'];

export function OrderPage() {
  const t = useT();
  const lang = useLang();
  const { params } = useRoute();
  const order = useAsync(() => api.order(params.id ?? ''), [params.id]);
  const [acted, setActed] = useState<string | null>(null);

  if (order.data === null) {
    return (
      <Page>
        <PageHead title={t('page.order')} onBack={() => navigate('/orders')} />
        <Empty text={order.loading ? t('common.loading') : t('common.empty')} />
      </Page>
    );
  }
  const o = order.data;
  const split = taxSplitOf(o.gross);
  const idx = STEPS.indexOf(o.status === 'disputed' || o.status === 'cancelled' ? 'escrow' : o.status);

  return (
    <Page>
      <PageHead title={o.productTitle[lang]} sub={o.id} onBack={() => navigate('/orders')} />
      <Card>
        <Badge tone={o.status === 'released' ? 'ok' : o.status === 'disputed' ? 'bad' : 'warn'}>
          {t(`status.${o.status}`)}
        </Badge>
        <h2 className="sec-title">{t('order.timeline')}</h2>
        <Timeline steps={STEPS.map((s, i) => ({ label: t(`status.${s}`), done: i <= idx }))} />
        {o.status === 'disputed' && <p className="sub">⚠ {t('status.disputed')}</p>}
      </Card>

      <Card>
        <h2 className="sec-title">{t('order.taxSplit')}</h2>
        <Row title={t('order.treasury')} sub={`${split.percent}%`} end={<span>{fmtDin(split.treasury, lang)}</span>} />
        <Row title={t('order.sellerShare')} end={<span>{fmtDin(split.seller, lang)}</span>} />
        <Row title={t('common.amount')} end={<strong>{fmtDin(o.gross, lang)}</strong>} />
      </Card>

      {o.role === 'buyer' && o.status === 'delivered' && (
        <div className="actions">
          <Btn onClick={() => setActed('released')}>{t('order.confirm')}</Btn>
          <Btn variant="danger" onClick={() => setActed('disputed')}>{t('order.dispute')}</Btn>
          <Btn variant="ghost" onClick={() => setActed('cancelled')}>{t('order.cancel')}</Btn>
        </div>
      )}
      {acted !== null && (
        <Card>
          <p className="sub">✓ {t(`status.${acted}`)}</p>
        </Card>
      )}
    </Page>
  );
}
