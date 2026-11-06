/**
 * Soul — port of soul.html: the agent's identity (stored, injected into
 * every reply, edited and saved with no redeploy) + a live prompt preview.
 */

import { useState } from 'react';
import { useSession } from '../../lib/session.js';
import { ops, useOps } from '../../lib/ops/store.js';
import { SEED_SOUL } from '../../lib/ops/seed.js';
import type { SoulProfile } from '../../lib/ops/types.js';
import { Banner, Button, Card, Field } from '../../components/ui.js';
import { OpsPage } from '../../components/ops-ui.js';
import type { I18nKey } from '../../lib/i18n.js';

const FIELDS: ReadonlyArray<readonly [keyof SoulProfile, I18nKey]> = [
  ['name', 'ops.soul.fName'],
  ['role', 'ops.soul.fRole'],
  ['company', 'ops.soul.fCompany'],
  ['mission', 'ops.soul.fMission'],
  ['personality', 'ops.soul.fPersonality'],
  ['tone', 'ops.soul.fTone'],
  ['languages', 'ops.soul.fLanguages'],
  ['greeting', 'ops.soul.fGreeting'],
  ['boundaries', 'ops.soul.fBoundaries'],
  ['styleRules', 'ops.soul.fStyle'],
  ['signature', 'ops.soul.fSignature'],
];

export function OpsSoulPage(): React.JSX.Element {
  const { t } = useSession();
  const s = useOps();
  const [draft, setDraft] = useState<SoulProfile>(s.soul);
  const [note, setNote] = useState(false);
  const dirty = JSON.stringify(draft) !== JSON.stringify(s.soul);

  const promptPreview = [
    `You are ${draft.name}, ${draft.role} at ${draft.company}.`,
    `Mission: ${draft.mission}`,
    `Personality: ${draft.personality} Tone: ${draft.tone} Languages: ${draft.languages}`,
    `Greeting: ${draft.greeting}`,
    `Boundaries: ${draft.boundaries}`,
    `Style: ${draft.styleRules}`,
    `Signature: ${draft.signature}`,
  ].join('\n');

  return (
    <OpsPage
      titleKey="ops.soul.title"
      kicker={t('ops.soul.sub')}
      actions={
        <>
          <Button onClick={() => setDraft(SEED_SOUL[0]!)}>{t('ops.common.defaults')}</Button>
          <Button
            variant="primary"
            disabled={!dirty}
            onClick={() => {
              ops.saveSoul(draft);
              setNote(true);
              window.setTimeout(() => setNote(false), 2000);
            }}
          >
            {t('ops.common.save')}
          </Button>
        </>
      }
    >
      {note && <Banner tone="mint">{t('ops.common.saved')} — {t('ops.soul.sub')}</Banner>}
      <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
        <Card title={t('ops.soul.identity')}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {FIELDS.map(([key, labelKey]) => (
              <Field key={key} label={t(labelKey)}>
                {key === 'mission' || key === 'boundaries' || key === 'styleRules' ? (
                  <textarea className="inp min-h-16" value={draft[key]} onChange={(e) => setDraft({ ...draft, [key]: e.target.value })} />
                ) : (
                  <input className="inp" value={draft[key]} onChange={(e) => setDraft({ ...draft, [key]: e.target.value })} />
                )}
              </Field>
            ))}
          </div>
        </Card>
        <Card title={t('ops.soul.prompt')}>
          <pre className="max-h-[420px] overflow-auto whitespace-pre-wrap rounded-lg border border-white/5 bg-black/30 p-3 text-[11px] leading-relaxed text-slate-300" dir="ltr">
            {promptPreview}
          </pre>
        </Card>
      </div>
    </OpsPage>
  );
}
