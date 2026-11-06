/**
 * Variables — port of settings.html: read-only deployment values (set in
 * Railway), Telegram bot settings, and all runtime variables with masked
 * secrets. Editable values save into the ops store without a redeploy.
 */

import { useState } from 'react';
import { useSession } from '../../lib/session.js';
import { ops, useOps } from '../../lib/ops/store.js';
import { Banner, Button, Card } from '../../components/ui.js';
import { OpsPage } from '../../components/ops-ui.js';

function VarRow({ k, value, secret, readonly_ }: { k: string; value: string; secret: boolean; readonly_: boolean }): React.JSX.Element {
  const { t } = useSession();
  const [draft, setDraft] = useState(value);
  const dirty = draft !== value;
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-white/5 py-2 last:border-0">
      <code className="w-44 shrink-0 font-mono text-[11px] text-cyan-300">{k}</code>
      {readonly_ ? (
        <span className={`min-w-0 flex-1 truncate font-mono text-[11px] ${secret ? 'text-amber-300/80' : 'text-slate-300'}`}>
          {secret ? '•••••• (masked)' : value}
        </span>
      ) : (
        <>
          <input
            className="inp min-w-0 flex-1 font-mono text-[11px]"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          <Button
            variant={dirty ? 'primary' : 'ghost'}
            disabled={!dirty}
            onClick={() => ops.saveVar(k, draft)}
          >
            {t('ops.common.save')}
          </Button>
        </>
      )}
    </div>
  );
}

export function OpsVariablesPage(): React.JSX.Element {
  const { t } = useSession();
  const s = useOps();
  const [note, setNote] = useState(false);

  const groups: ReadonlyArray<['deploy' | 'bot' | 'runtime', string]> = [
    ['deploy', t('ops.variables.deploy')],
    ['bot', t('ops.variables.bot')],
    ['runtime', t('ops.variables.runtime')],
  ];

  return (
    <OpsPage titleKey="ops.variables.title" kicker={t('ops.variables.sub')}>
      {note && <Banner tone="mint">{t('ops.common.saved')}</Banner>}
      {groups.map(([g, label]) => (
        <Card key={g} title={label}>
          <div>
            {s.vars.filter((v) => v.group === g).map((v) => (
              <VarRow key={v.key} k={v.key} value={v.value} secret={v.secret} readonly_={v.readonly_} />
            ))}
          </div>
          {g === 'runtime' && <p className="mt-2 text-[11px] text-ink-dim">🔒 {t('ops.variables.secretsMasked')}</p>}
          {g === 'bot' && (
            <div className="mt-3">
              <Button
                onClick={() => {
                  setNote(true);
                  window.setTimeout(() => setNote(false), 2000);
                }}
              >
                {t('ops.common.save')}
              </Button>
            </div>
          )}
        </Card>
      ))}
    </OpsPage>
  );
}
