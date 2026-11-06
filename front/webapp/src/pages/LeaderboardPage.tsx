import { Card, Empty, Page, PageHead, Stat, useLang, useT } from '../components/ui';
import { api, useAsync } from '../lib/api';
import { fmtNum } from '../lib/format';

export function LeaderboardPage() {
  const t = useT();
  const lang = useLang();
  const rows = useAsync(api.leaderboard, []);

  if (rows.data === null) {
    return (
      <Page>
        <PageHead title={t('page.leaderboard')} />
        <Empty text={t('common.loading')} />
      </Page>
    );
  }
  const myIdx = rows.data.findIndex((r) => r.isMe);

  return (
    <Page>
      <PageHead title={t('page.leaderboard')} />
      {myIdx >= 0 && (
        <div className="grid2">
          <Stat label={t('leaderboard.you')} value={`#${fmtNum(myIdx + 1, lang)}`} />
          <Stat label={t('leaderboard.points')} value={fmtNum(rows.data[myIdx]!.points, lang)} />
        </div>
      )}
      <Card>
        {rows.data.map((r, i) => (
          <div key={i} className={r.isMe ? 'row row-tap row-me' : 'row'}>
            <div className="row-main">
              <span className="row-title">
                {i < 3 ? ['🥇', '🥈', '🥉'][i] : `${fmtNum(i + 1, lang)}.`} {r.handle[lang]}
              </span>
            </div>
            <div className="row-end">
              <span className="price">{fmtNum(r.points, lang)}</span>
            </div>
          </div>
        ))}
      </Card>
    </Page>
  );
}
