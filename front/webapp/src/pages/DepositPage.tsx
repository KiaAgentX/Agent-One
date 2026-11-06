import { useState } from 'react';
import { Btn, Card, Field, Page, PageHead, useLang, useT } from '../components/ui';
import { api } from '../lib/api';
import { fmtNum, fmtDin } from '../lib/format';
import { navigate } from '../lib/router';
import { validateDinarAmount } from '@dropagentx/nation';

const PACKS = [10_000, 50_000, 250_000];

export function DepositPage() {
  const t = useT();
  const lang = useLang();
  const [custom, setCustom] = useState('');
  const [msg, setMsg] = useState<string | null>(null);

  const deposit = (amount: number) => {
    api.deposit(amount).then(() => {
      setMsg(`✓ +${fmtDin(amount, lang)}`);
      setTimeout(() => navigate('/wallet'), 700);
    });
  };

  return (
    <Page>
      <PageHead title={t('page.deposit')} onBack={() => navigate('/wallet')} />

      <Card>
        <h2 className="sec-title">{t('deposit.packages')}</h2>
        <p className="sub">{t('deposit.rate')}</p>
        <div className="grid3">
          {PACKS.map((p) => (
            <Card key={p} onClick={() => deposit(p)}>
              <strong>{fmtNum(p / 10_000, lang)} ⭐</strong>
              <span className="sub">{fmtNum(p, lang)}</span>
            </Card>
          ))}
        </div>
      </Card>

      <Field label={t('deposit.custom')}>
        <input
          className="input"
          inputMode="numeric"
          dir="ltr"
          value={custom}
          onChange={(e) => setCustom(e.target.value.replace(/[^\d]/g, ''))}
          data-testid="deposit-input"
        />
      </Field>
      <Btn
        disabled={custom === ''}
        onClick={() => {
          const n = Number(custom);
          try {
            validateDinarAmount(n);
            deposit(n);
          } catch {
            setMsg(t('add.invalidPrice'));
          }
        }}
      >
        {t('common.confirm')}
      </Btn>
      {msg && <Card><p className="sub">{msg}</p></Card>}
    </Page>
  );
}
