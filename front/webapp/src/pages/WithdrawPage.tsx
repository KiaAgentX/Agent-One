import { useState } from 'react';
import { Btn, Card, Field, Page, PageHead, useLang, useT } from '../components/ui';
import { api, useAsync } from '../lib/api';
import { fmtDin, fmtNum } from '../lib/format';
import { navigate } from '../lib/router';
import { validateDinarAmount } from '@dropagentx/nation';

export function WithdrawPage() {
  const t = useT();
  const lang = useLang();
  const wallet = useAsync(api.wallet, []);
  const [amount, setAmount] = useState('');
  const [msg, setMsg] = useState<string | null>(null);

  const balance = wallet.data?.balance ?? 0;
  const stars = Math.floor(Number(amount || 0) / 10_000);

  const submit = () => {
    const n = Number(amount);
    try {
      validateDinarAmount(n);
      if (n > balance) {
        setMsg(t('add.invalidPrice'));
        return;
      }
      api.withdraw(n).then(() => {
        setMsg(`✓ −${fmtDin(n, lang)} → ⭐ ${fmtNum(stars, lang)}`);
        setTimeout(() => navigate('/wallet'), 700);
      });
    } catch {
      setMsg(t('add.invalidPrice'));
    }
  };

  return (
    <Page>
      <PageHead title={t('page.withdraw')} onBack={() => navigate('/wallet')} />
      <Card>
        <p className="sub">{t('withdraw.starsNote')}</p>
        <p className="sub">{t('deposit.rate')}</p>
      </Card>
      <Field label={t('common.amount')} hint={`${t('home.balance')}: ${fmtDin(balance, lang)}`}>
        <input
          className="input"
          inputMode="numeric"
          dir="ltr"
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ''))}
          data-testid="withdraw-input"
        />
      </Field>
      {amount !== '' && (
        <Card>
          <span className="sub">→ ⭐ {fmtNum(stars, lang)}</span>
        </Card>
      )}
      <Btn disabled={amount === ''} onClick={submit}>
        {t('common.confirm')}
      </Btn>
      {msg && <Card><p className="sub">{msg}</p></Card>}
    </Page>
  );
}
