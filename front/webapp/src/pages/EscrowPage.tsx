import { Badge, Card, Empty, Page, PageHead, Row, useLang, useT } from '../components/ui';
import { api, useAsync } from '../lib/api';
import { fmtDin } from '../lib/format';
import { navigate } from '../lib/router';

export function EscrowPage() {
  const t = useT();
  const lang = useLang();
  const escrows = useAsync(api.escrows, []);

  return (
    <Page>
      <PageHead title={t('page.escrow')} />
      <Card>
        <h2 className="sec-title">{t('escrow.how')}</h2>
        <p className="sub">{t('escrow.howBody')}</p>
      </Card>

      <h2 className="sec-title">{t('escrow.active')}</h2>
      {escrows.data === null ? (
        <Empty text={t('common.loading')} />
      ) : escrows.data.length === 0 ? (
        <Empty text={t('common.empty')} />
      ) : (
        <Card>
          {escrows.data.map((e) => (
            <Row
              key={e.id}
              title={e.productTitle[lang]}
              sub={`${e.counterparty[lang]} · ${e.id}`}
              end={
                <span className="row-end-stack">
                  <Badge tone={e.state === 'released' ? 'ok' : e.state === 'funded' ? 'warn' : 'info'}>
                    {t(`status.${e.state}`)}
                  </Badge>
                  <span className="price">{fmtDin(e.amount, lang)}</span>
                </span>
              }
              onClick={() => navigate('/orders')}
            />
          ))}
        </Card>
      )}
    </Page>
  );
}
