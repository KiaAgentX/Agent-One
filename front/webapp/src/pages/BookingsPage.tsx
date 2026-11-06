import { useState } from 'react';
import { Badge, Card, Empty, Page, PageHead, Row, Segmented, useLang, useT } from '../components/ui';
import { api, useAsync } from '../lib/api';
import { fmtDin, fmtDay } from '../lib/format';
import { navigate } from '../lib/router';

export function BookingsPage() {
  const t = useT();
  const lang = useLang();
  const bookings = useAsync(api.bookings, []);
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');
  const today = '2026-11-06';
  const list = (bookings.data ?? []).filter((b) =>
    tab === 'upcoming' ? b.date >= today && b.status !== 'cancelled' : b.date < today || b.status === 'cancelled',
  );

  return (
    <Page>
      <PageHead title={t('page.bookings')} />
      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { id: 'upcoming', label: t('bookings.upcoming') },
          { id: 'past', label: t('bookings.past') },
        ]}
      />
      {bookings.data === null ? (
        <Empty text={t('common.loading')} />
      ) : list.length === 0 ? (
        <Empty text={t('common.empty')} />
      ) : (
        <Card>
          {list.map((b) => (
            <Row
              key={b.id}
              title={b.title[lang]}
              sub={`${b.provider[lang]} · ${fmtDay(b.date, lang)} ${b.time}`}
              end={
                <span className="row-end-stack">
                  <Badge tone={b.status === 'confirmed' ? 'ok' : b.status === 'pending' ? 'warn' : 'muted'}>
                    {t(`status.${b.status}`)}
                  </Badge>
                  <span className="price">{fmtDin(b.price, lang)}</span>
                </span>
              }
              onClick={() => navigate(`/booking/${b.id}`)}
            />
          ))}
        </Card>
      )}
    </Page>
  );
}
