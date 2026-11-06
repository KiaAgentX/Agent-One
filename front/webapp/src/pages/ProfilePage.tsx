import { Avatar, Card, Page, PageHead, Row, Stat, useLang, useT } from '../components/ui';
import { api, useAsync } from '../lib/api';
import { accountIdForTelegramish } from '../lib/identity';
import { fmtNum } from '../lib/format';
import { navigate } from '../lib/router';
import { tgUser } from '../lib/telegram';

export function ProfilePage() {
  const t = useT();
  const lang = useLang();
  const orders = useAsync(api.orders, []);
  const user = tgUser();
  const name = user?.first_name ?? user?.username ?? 'DropAgentX';
  const handle = user?.username !== undefined ? `@${user.username}` : (user?.id !== undefined ? String(user.id) : '—');

  return (
    <Page>
      <PageHead title={t('page.profile')} />
      <Card className="balance-card">
        <span className="row-with-avatar">
          <Avatar name={name} />
          <strong>{name}</strong>
        </span>
        <span className="sub" dir="ltr">{handle}</span>
      </Card>

      <Card>
        <Row title={t('profile.tgId')} end={<span className="sub" dir="ltr">{user?.id ?? '—'}</span>} />
        <Row title={t('profile.account')} end={<span className="sub" dir="ltr">{accountIdForTelegramish(user?.id ?? 0)}</span>} />
      </Card>

      <h2 className="sec-title">{t('profile.stats')}</h2>
      <div className="grid2">
        <Stat label={t('profile.orders')} value={fmtNum((orders.data ?? []).length, lang)} />
        <Stat label={t('leaderboard.points')} value={fmtNum(5990, lang)} />
      </div>

      <Card onClick={() => navigate('/settings')}>
        <strong>→ {t('page.settings')}</strong>
      </Card>
      <Card onClick={() => navigate('/help')}>
        <strong>→ {t('page.help')}</strong>
      </Card>
    </Page>
  );
}
