import { Card, Page, PageHead, Row, Stat, useLang, useT } from '../components/ui';
import { fmtDin, fmtNum } from '../lib/format';
import { api, subscribeStore, useAsync } from '../lib/api';
import { tgUser } from '../lib/telegram';
import { navigate } from '../lib/router';
import { useEffect, useState } from 'react';

export function HomePage() {
  const t = useT();
  const lang = useLang();
  const wallet = useAsync(api.wallet, []);
  const txs = useAsync(api.transactions, []);
  const [, bump] = useState(0);
  useEffect(() => subscribeStore(() => bump((n) => n + 1)), []);

  const user = tgUser();
  const name = user?.first_name ?? user?.username ?? t('page.profile');

  return (
    <Page>
      <PageHead title={`${t('home.greet')}، ${name}`} sub={t('app.tagline')} />
      <Card className="balance-card">
        <span className="sub">{t('home.balance')}</span>
        <strong className="balance" data-testid="home-balance">
          {wallet.data === null ? '…' : fmtDin(wallet.data.balance, lang)}
        </strong>
        <span className="sub">
          {t('home.starReserve')}: {wallet.data === null ? '…' : `⭐ ${fmtNum(wallet.data.stars, lang)}`}
        </span>
      </Card>

      <h2 className="sec-title">{t('home.quick')}</h2>
      <div className="grid4">
        <Card onClick={() => navigate('/market')}>{t('page.market')}</Card>
        <Card onClick={() => navigate('/wallet')}>{t('page.wallet')}</Card>
        <Card onClick={() => navigate('/quests')}>{t('page.quests')}</Card>
        <Card onClick={() => navigate('/referral')}>{t('page.referral')}</Card>
      </div>

      <h2 className="sec-title">{t('home.recent')}</h2>
      <Card>
        {txs.data === null ? (
          <p className="sub">…</p>
        ) : (
          txs.data.slice(0, 4).map((tx) => (
            <Row
              key={tx.id}
              title={tx.label[lang]}
              sub={new Date(tx.ts).toLocaleDateString(lang === 'fa' ? 'fa-IR' : 'en-US')}
              end={
                <span className={tx.kind === 'in' ? 'amt-in' : 'amt-out'}>
                  {tx.kind === 'in' ? '+' : '−'}{fmtNum(tx.amount, lang)}
                </span>
              }
            />
          ))
        )}
      </Card>
      <Stat label={t('page.charter')} value="§1–10" />
    </Page>
  );
}
