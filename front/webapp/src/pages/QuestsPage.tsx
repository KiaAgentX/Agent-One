import { Card, Empty, Page, PageHead, Progress, useLang, useT } from '../components/ui';
import { api, useAsync } from '../lib/api';
import { fmtDin, fmtNum } from '../lib/format';
import { navigate } from '../lib/router';

export function QuestsPage() {
  const t = useT();
  const lang = useLang();
  const quests = useAsync(api.quests, []);

  return (
    <Page>
      <PageHead title={t('page.quests')} sub={t('quests.cap')} />
      {quests.data === null ? (
        <Empty text={t('common.loading')} />
      ) : (
        quests.data.map((q) => (
          <Card key={q.id} onClick={() => navigate(`/quest/${q.id}`)}>
            <div className="row-main">
              <span className="row-title">{q.title[lang]}</span>
              <span className="sub">
                {t('quests.expires')}: {q.expires}
              </span>
            </div>
            <Progress value={q.progress} goal={q.goal} />
            <span className="price">
              {t('quests.reward')}: {fmtDin(q.reward, lang)}
            </span>
            <span className="sub">
              {fmtNum(q.progress, lang)} / {fmtNum(q.goal, lang)}
            </span>
          </Card>
        ))
      )}
    </Page>
  );
}
