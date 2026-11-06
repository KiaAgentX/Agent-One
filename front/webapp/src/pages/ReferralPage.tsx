import { useState } from 'react';
import { Btn, Card, Page, PageHead, Row, Stat, useLang, useT } from '../components/ui';
import { api, useAsync } from '../lib/api';
import { fmtDin, fmtNum } from '../lib/format';

export function ReferralPage() {
  const t = useT();
  const lang = useLang();
  const ref = useAsync(api.referral, []);
  const [copied, setCopied] = useState(false);

  if (ref.data === null) {
    return (
      <Page>
        <PageHead title={t('page.referral')} />
        <p className="sub">…</p>
      </Page>
    );
  }
  const r = ref.data;

  return (
    <Page>
      <PageHead title={t('page.referral')} />
      <Card className="balance-card">
        <span className="sub">{t('ref.code')}</span>
        <strong className="balance" dir="ltr">{r.code}</strong>
        <Btn
          onClick={() => {
            navigator.clipboard?.writeText(r.link).catch(() => undefined);
            setCopied(true);
          }}
        >
          {copied ? t('common.copied') : t('common.copy')}
        </Btn>
      </Card>

      <div className="grid3">
        <Stat label={t('ref.invited')} value={fmtNum(r.invited, lang)} />
        <Stat label={t('ref.confirmed')} value={fmtNum(r.confirmed, lang)} />
        <Stat label={t('ref.earned')} value={fmtDin(r.earned, lang)} />
      </div>

      <Card>
        <Row title={t('ref.link')} end={<span className="sub" dir="ltr">{r.link.slice(0, 28)}…</span>} />
      </Card>
    </Page>
  );
}
