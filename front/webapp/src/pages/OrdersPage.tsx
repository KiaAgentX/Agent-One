import { useState } from 'react';
import { Badge, Card, Empty, Page, PageHead, Row, Segmented, useLang, useT } from '../components/ui';
import { api, useAsync } from '../lib/api';
import { fmtDin } from '../lib/format';
import { navigate } from '../lib/router';
import type { Order } from '../lib/demo';

const TONES: Record<Order['status'], 'ok' | 'warn' | 'bad' | 'info' | 'muted'> = {
  paid: 'info',
  escrow: 'warn',
  delivered: 'warn',
  released: 'ok',
  disputed: 'bad',
  cancelled: 'muted',
};

export function OrdersPage() {
  const t = useT();
  const lang = useLang();
  const orders = useAsync(api.orders, []);
  const [tab, setTab] = useState<'buyer' | 'seller'>('buyer');

  const list = (orders.data ?? []).filter((o) => o.role === tab);

  return (
    <Page>
      <PageHead title={t('page.orders')} />
      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { id: 'buyer', label: t('status.in') },
          { id: 'seller', label: t('status.out') },
        ]}
      />
      {orders.data === null ? (
        <Empty text={t('common.loading')} />
      ) : list.length === 0 ? (
        <Empty text={t('common.empty')} />
      ) : (
        <Card>
          {list.map((o) => (
            <Row
              key={o.id}
              title={o.productTitle[lang]}
              sub={`${o.counterpart[lang]} · ${o.id}`}
              end={
                <span className="row-end-stack">
                  <Badge tone={TONES[o.status]}>{t(`status.${o.status}`)}</Badge>
                  <span className="price">{fmtDin(o.gross, lang)}</span>
                </span>
              }
              onClick={() => navigate(`/order/${o.id}`)}
            />
          ))}
        </Card>
      )}
    </Page>
  );
}
