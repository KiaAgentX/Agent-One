import { useMemo, useState } from 'react';
import { Avatar, Badge, Card, Empty, Page, PageHead, Row, useLang, useT } from '../components/ui';
import { api, useAsync } from '../lib/api';
import { fmtDin, fmtNum } from '../lib/format';

export function CrmPage() {
  const t = useT();
  const lang = useLang();
  const customers = useAsync(api.crm, []);
  const [q, setQ] = useState('');

  const list = useMemo(() => {
    const all = customers.data ?? [];
    return all.filter((c) => q.trim() === '' || c.name[lang].toLowerCase().includes(q.toLowerCase()));
  }, [customers.data, q, lang]);

  return (
    <Page>
      <PageHead title={t('page.crm')} />
      <input className="input" placeholder={t('common.search')} value={q} onChange={(e) => setQ(e.target.value)} />
      {customers.data === null ? (
        <Empty text={t('common.loading')} />
      ) : list.length === 0 ? (
        <Empty text={t('common.empty')} />
      ) : (
        <Card>
          {list.map((c) => (
            <Row
              key={c.id}
              title={
                <span className="row-with-avatar">
                  <Avatar name={c.name[lang]} /> {c.name[lang]}
                </span>
              }
              sub={c.note[lang]}
              end={
                <span className="row-end-stack">
                  <Badge tone={c.tag === 'vip' ? 'ok' : c.tag === 'customer' ? 'info' : 'muted'}>
                    {t(`status.${c.tag}`)}
                  </Badge>
                  <span className="sub">
                    {fmtNum(c.ordersCount, lang)} {t('crm.orders')} · {fmtDin(c.spent, lang)}
                  </span>
                </span>
              }
            />
          ))}
        </Card>
      )}
    </Page>
  );
}
