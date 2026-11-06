import { useState } from 'react';
import { Badge, Btn, Card, Field, Page, PageHead, useLang, useT } from '../components/ui';
import { api } from '../lib/api';
import { fmtDin } from '../lib/format';
import { navigate } from '../lib/router';
import { requiresHitl, validateDinarAmount } from '@dropagentx/nation';

export function TransferPage() {
  const t = useT();
  const lang = useLang();
  const [to, setTo] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [msg, setMsg] = useState<string | null>(null);

  const n = Number(amount || 0);
  const hitl = requiresHitl(n);

  const submit = () => {
    try {
      validateDinarAmount(n);
      if (to.trim().length < 3) {
        setMsg(t('add.invalidPrice'));
        return;
      }
      api.transfer(to.trim(), n).then(() => {
        setMsg(`✓ −${fmtDin(n, lang)} → ${to.trim()}`);
        setTimeout(() => navigate('/wallet'), 700);
      });
    } catch {
      setMsg(t('add.invalidPrice'));
    }
  };

  return (
    <Page>
      <PageHead title={t('page.transfer')} onBack={() => navigate('/wallet')} />
      <Field label={t('transfer.to')}>
        <input className="input" dir="ltr" value={to} onChange={(e) => setTo(e.target.value)} placeholder="@username" />
      </Field>
      <Field label={t('common.amount')}>
        <input
          className="input"
          inputMode="numeric"
          dir="ltr"
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ''))}
          data-testid="transfer-input"
        />
      </Field>
      <Field label={t('transfer.notePh')}>
        <input className="input" value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
      {hitl && (
        <Card>
          <Badge tone="warn">HITL</Badge>
          <p className="sub">{t('transfer.hitlWarn')}</p>
        </Card>
      )}
      <Btn disabled={amount === '' || to.trim().length < 3} onClick={submit}>
        {t('common.confirm')}
      </Btn>
      {msg && <Card><p className="sub">{msg}</p></Card>}
    </Page>
  );
}
