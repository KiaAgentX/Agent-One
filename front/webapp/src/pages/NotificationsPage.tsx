import { useState } from 'react';
import { Badge, Btn, Card, Empty, Page, PageHead, Row, useLang, useT } from '../components/ui';
import { api, useAsync } from '../lib/api';
import { fmtTime } from '../lib/format';

export function NotificationsPage() {
  const t = useT();
  const lang = useLang();
  const list = useAsync(api.notifications, []);
  const [, bump] = useState(0);

  return (
    <Page>
      <PageHead
        title={t('page.notifications')}
        sub={
          <button
            type="button"
            className="linklike"
            onClick={() => {
              api.markAllRead().then(() => bump((n) => n + 1));
            }}
          >
            {t('notif.markAll')}
          </button>
        }
      />
      {list.data === null ? (
        <Empty text={t('common.loading')} />
      ) : list.data.length === 0 ? (
        <Empty text={t('common.empty')} />
      ) : (
        <Card>
          {list.data.map((n) => (
            <Row
              key={n.id}
              title={
                <span>
                  {!n.read && <Badge tone="warn">{t('status.unread')}</Badge>} {n.title[lang]}
                </span>
              }
              sub={n.body[lang]}
              end={<span className="sub">{fmtTime(n.ts, lang)}</span>}
            />
          ))}
        </Card>
      )}
      <Btn variant="ghost" onClick={() => bump((n) => n + 1)}>{t('common.save')}</Btn>
    </Page>
  );
}
