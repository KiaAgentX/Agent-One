import { useState } from 'react';
import { Badge, Btn, Card, Empty, Page, PageHead, Progress, useLang, useT } from '../components/ui';
import { api, useAsync } from '../lib/api';
import { fmtDin, fmtNum } from '../lib/format';
import { navigate, useRoute } from '../lib/router';

export function QuestPage() {
  const t = useT();
  const lang = useLang();
  const { params } = useRoute();
  const quest = useAsync(() => api.quest(params.id ?? ''), [params.id]);
  const [started, setStarted] = useState(false);

  if (quest.data === null) {
    return (
      <Page>
        <PageHead title={t('page.quest')} onBack={() => navigate('/quests')} />
        <Empty text={quest.loading ? t('common.loading') : t('common.empty')} />
      </Page>
    );
  }
  const q = quest.data;

  return (
    <Page>
      <PageHead title={q.title[lang]} onBack={() => navigate('/quests')} />
      <Card>
        <Badge tone="ok">
          {t('quests.reward')}: {fmtDin(q.reward, lang)}
        </Badge>
        <Progress value={q.progress} goal={q.goal} />
        <p className="sub">
          {fmtNum(q.progress, lang)} / {fmtNum(q.goal, lang)} · {t('quests.expires')}: {q.expires}
        </p>
        {started && <p className="sub">✓ {t('status.pending')}</p>}
      </Card>
      <Btn disabled={started} onClick={() => setStarted(true)}>
        {t('common.submit')}
      </Btn>
    </Page>
  );
}
