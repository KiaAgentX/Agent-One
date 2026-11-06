import { useMemo, useState } from 'react';
import { Badge, Card, Empty, Page, PageHead, Row, Segmented, useLang, useT } from '../components/ui';
import { api, useAsync } from '../lib/api';
import { fmtDay, fmtNum, fmtTime } from '../lib/format';
import { navigate } from '../lib/router';

export function HistoryPage() {
  const t = useT();
  const lang = useLang();
  const txs = useAsync(api.transactions, []);
  const [filter, setFilter] = useState<'all' | 'in' | 'out'>('all');

  const list = useMemo(() => {
    const all = txs.data ?? [];
    return all.filter((tx) => filter === 'all' || tx.kind === filter);
  }, [txs.data, filter]);

  const groups = useMemo(() => {
    const map = new Map<string, typeof list>();
    for (const tx of list) {
      const day = tx.ts.slice(0, 10);
      const arr = map.get(day) ?? [];
      arr.push(tx);
      map.set(day, arr);
    }
    return [...map.entries()];
  }, [list]);

  return (
    <Page>
      <PageHead title={t('page.history')} onBack={() => navigate('/wallet')} />
      <Segmented
        value={filter}
        onChange={setFilter}
        options={[
          { id: 'all', label: t('common.all') },
          { id: 'in', label: t('status.in') },
          { id: 'out', label: t('status.out') },
        ]}
      />
      {txs.data === null ? (
        <Empty text={t('common.loading')} />
      ) : groups.length === 0 ? (
        <Empty text={t('common.empty')} />
      ) : (
        groups.map(([day, items]) => (
          <div key={day}>
            <h2 className="sec-title">{fmtDay(`${day}T12:00:00Z`, lang)}</h2>
            <Card>
              {items.map((tx) => (
                <Row
                  key={tx.id}
                  title={tx.label[lang]}
                  sub={fmtTime(tx.ts, lang)}
                  end={
                    <span className={tx.kind === 'in' ? 'amt-in' : 'amt-out'}>
                      {tx.kind === 'in' ? '+' : '−'}{fmtNum(tx.amount, lang)}
                    </span>
                  }
                />
              ))}
            </Card>
          </div>
        ))
      )}
    </Page>
  );
}
