import { useEffect, useState } from 'react';
import { Btn, Card, Empty, Page, PageHead, Row, useLang, useT } from '../components/ui';
import { api, subscribeStore, useAsync } from '../lib/api';
import { fmtDin, fmtNum } from '../lib/format';
import { navigate } from '../lib/router';

export function WalletPage() {
  const t = useT();
  const lang = useLang();
  const wallet = useAsync(api.wallet, []);
  const txs = useAsync(api.transactions, []);
  const [, bump] = useState(0);
  useEffect(() => subscribeStore(() => bump((n) => n + 1)), []);

  return (
    <Page>
      <PageHead title={t('page.wallet')} />
      <Card className="balance-card">
        <span className="sub">{t('home.balance')}</span>
        <strong className="balance" data-testid="wallet-balance">
          {wallet.data === null ? '…' : fmtDin(wallet.data.balance, lang)}
        </strong>
        <span className="sub">
          {t('wallet.stars')}: {wallet.data === null ? '…' : `⭐ ${fmtNum(wallet.data.stars, lang)}`}
        </span>
      </Card>

      <h2 className="sec-title">{t('wallet.actions')}</h2>
      <div className="grid4">
        <Card onClick={() => navigate('/deposit')}>{t('page.deposit')}</Card>
        <Card onClick={() => navigate('/withdraw')}>{t('page.withdraw')}</Card>
        <Card onClick={() => navigate('/transfer')}>{t('page.transfer')}</Card>
        <Card onClick={() => navigate('/history')}>{t('page.history')}</Card>
      </div>

      <h2 className="sec-title">{t('home.recent')}</h2>
      {txs.data === null ? (
        <Empty text={t('common.loading')} />
      ) : (
        <Card>
          {txs.data.slice(0, 5).map((tx) => (
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
          ))}
        </Card>
      )}
    </Page>
  );
}
