/**
 * Ops page registry — the 24 slugs mapped to their ported components.
 * App.tsx renders through this map; the RULEBOOK audit (Law 6) counts
 * 24 doors here against legacy/agi-main/admin/ops/*.html.
 */

import type { OpsSlug } from '../../lib/router.js';
import { OpsDeskPage } from './OpsDesk.js';
import { OpsHubPage } from './OpsHub.js';
import { OpsQueuePage } from './OpsQueue.js';
import { OpsCatalogPage } from './OpsCatalog.js';
import { OpsVariablesPage } from './OpsVariables.js';
import { OpsSoulPage } from './OpsSoul.js';
import { OpsSimulatorPage } from './OpsSimulator.js';
import { OpsDatabasePage } from './OpsDatabase.js';
import { OpsCharterPage, OpsControlPage } from './OpsCharter.js';
import { OpsInboxPage } from './OpsInbox.js';
import { OpsWebsitePage, OpsSocialPage, OpsSalesPage, OpsSupportPage, OpsOperationsPage } from './OpsFlows.js';
import { OpsKnowledgePage, OpsBrainPage } from './OpsKnowledge.js';
import { OpsAuditPage, OpsAutomationPage } from './OpsAudit.js';
import { OpsLivePage } from './OpsLive.js';
import { OpsInsightsPage } from './OpsInsights.js';
import { OpsMarketPage } from './OpsMarket.js';
import { OpsEcosystemPage } from './OpsEcosystem.js';

export const OPS_PAGES: Readonly<Record<OpsSlug, () => React.JSX.Element>> = {
  desk: OpsDeskPage,
  hub: OpsHubPage,
  queue: OpsQueuePage,
  catalog: OpsCatalogPage,
  variables: OpsVariablesPage,
  soul: OpsSoulPage,
  simulator: OpsSimulatorPage,
  database: OpsDatabasePage,
  charter: OpsCharterPage,
  inbox: OpsInboxPage,
  website: OpsWebsitePage,
  social: OpsSocialPage,
  sales: OpsSalesPage,
  support: OpsSupportPage,
  operations: OpsOperationsPage,
  knowledge: OpsKnowledgePage,
  brain: OpsBrainPage,
  control: OpsControlPage,
  audit: OpsAuditPage,
  automation: OpsAutomationPage,
  live: OpsLivePage,
  insights: OpsInsightsPage,
  market: OpsMarketPage,
  ecosystem: OpsEcosystemPage,
};

export const OPS_PAGE_COUNT = Object.keys(OPS_PAGES).length;
