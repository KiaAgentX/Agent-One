import { useState } from 'react';
import { Badge, Btn, Card, Empty, Page, PageHead, Row, useLang, useT } from '../components/ui';
import { api, useAsync } from '../lib/api';
import { fmtDin, fmtDay } from '../lib/format';
import { navigate, useRoute } from '../lib/router';

export function BookingPage() {
  const t = useT();
  const lang = useLang();
  const { params } = useRoute();
  const booking = useAsync(() => api.booking(params.id ?? ''), [params.id]);
  const [cancelled, setCancelled] = useState(false);

  if (booking.data === null) {
    return (
      <Page>
        <PageHead title={t('page.booking')} onBack={() => navigate('/bookings')} />
        <Empty text={booking.loading ? t('common.loading') : t('common.empty')} />
      </Page>
    );
  }
  const b = booking.data;

  return (
    <Page>
      <PageHead title={b.title[lang]} onBack={() => navigate('/bookings')} />
      <Card>
        <Row title={t('booking.provider')} end={<span>{b.provider[lang]}</span>} />
        <Row title={t('booking.when')} end={<span>{`${fmtDay(b.date, lang)} · ${b.time}`}</span>} />
        <Row title={t('common.amount')} end={<strong>{fmtDin(b.price, lang)}</strong>} />
        <Badge tone={b.status === 'confirmed' ? 'ok' : b.status === 'pending' ? 'warn' : 'muted'}>
          {t(`status.${b.status}`)}
        </Badge>
      </Card>
      {b.status !== 'cancelled' && !cancelled && (
        <Btn variant="danger" onClick={() => setCancelled(true)}>
          {t('order.cancel')}
        </Btn>
      )}
      {cancelled && <Card><p className="sub">✓ {t('status.cancelled')}</p></Card>}
    </Page>
  );
}
