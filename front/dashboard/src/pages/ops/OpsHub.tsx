/**
 * Hub — port of hub.html: the glass hub with every console door on one
 * page (the DropAgent /links pattern). Two sections, mirroring the rail.
 */

import { useSession } from '../../lib/session.js';
import { Card } from '../../components/ui.js';
import { GlassLink, OpsPage } from '../../components/ops-ui.js';
import type { I18nKey } from '../../lib/i18n.js';

const COMMAND: ReadonlyArray<readonly [string, string, I18nKey, string]> = [
  ['/ops/ecosystem', '◉', 'ops.nav.ecosystem', '3D channels · HITL · storage'],
  ['/ops/charter', '⚖', 'ops.nav.charter', 'Access matrix · phases · specialists'],
  ['/ops/desk', '⌘', 'ops.nav.desk', 'Day board'],
  ['/ops/inbox', '✉', 'ops.nav.inbox', 'Classify · reply · hold'],
  ['/ops/queue', '☰', 'ops.nav.queue', 'Never-auto gates'],
  ['/ops/soul', '♥', 'ops.nav.soul', 'Name · role · tone · boundaries'],
  ['/ops/simulator', '🗨', 'ops.nav.simulator', 'The bot, exactly'],
  ['/ops/database', '🗄', 'ops.nav.database', 'Browse · edit · JSON in/out'],
];

const FLOWS: ReadonlyArray<readonly [string, string, I18nKey, string]> = [
  ['/ops/website', '🌐', 'ops.nav.website', 'Forms → leads · price gate'],
  ['/ops/social', '▦', 'ops.nav.social', 'Calendar auto · claims held'],
  ['/ops/sales', '📈', 'ops.nav.sales', 'Lead → qualify → quote'],
  ['/ops/support', '☎', 'ops.nav.support', 'Ticket · first line · SLA'],
  ['/ops/operations', '✳', 'ops.nav.operations', 'Report · remind · coordinate'],
  ['/ops/knowledge', '▤', 'ops.nav.knowledge', 'Draft → review → index'],
  ['/ops/brain', '◉', 'ops.nav.brain', 'Atom · shells · 2n²'],
  ['/ops/control', '⚙', 'ops.nav.control', 'Access matrix · roles'],
  ['/ops/audit', '≡', 'ops.nav.audit', 'Every decision, logged'],
  ['/ops/automation', '↻', 'ops.nav.automation', 'Phase-5 cron jobs'],
  ['/ops/live', '●', 'ops.nav.live', 'Gauges · mock stream'],
  ['/ops/insights', 'bars', 'ops.nav.insights', '14-day SVG'],
  ['/ops/market', '🛍', 'ops.nav.market', 'Storefront · quotes HITL'],
  ['/ops/catalog', '▬', 'ops.nav.catalog', 'Products the bot sells'],
  ['/ops/variables', '⚑', 'ops.nav.variables', 'Everything the bot shows'],
];

export function OpsHubPage(): React.JSX.Element {
  const { t } = useSession();
  return (
    <OpsPage titleKey="ops.hub.title" kicker={t('ops.hub.sub')}>
      <Card title={t('ops.section.command')}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {COMMAND.map(([href, icon, key, desc]) => (
            <GlassLink key={href} href={href} icon={icon} titleKey={key} desc={desc} />
          ))}
        </div>
      </Card>
      <Card title={t('ops.section.flows')}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {FLOWS.map(([href, icon, key, desc]) => (
            <GlassLink key={href} href={href} icon={icon} titleKey={key} desc={desc} />
          ))}
        </div>
      </Card>
    </OpsPage>
  );
}
