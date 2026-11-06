/**
 * pages/index.ts — the page registry: every routes.ts id maps to exactly one
 * real component. The parity test (tests/pages.test.tsx) asserts this map is
 * TOTAL over the 30 ids — a stub can never come back unnoticed (Law 9-B).
 */

import type { ComponentType } from 'react';
import type { PageId } from '../routes';

import { HomePage } from './HomePage';
import { OnboardingPage } from './OnboardingPage';
import { NotificationsPage } from './NotificationsPage';
import { HelpPage } from './HelpPage';
import { CharterPage } from './CharterPage';
import { MarketPage } from './MarketPage';
import { ProductPage } from './ProductPage';
import { CheckoutPage } from './CheckoutPage';
import { OrdersPage } from './OrdersPage';
import { OrderPage } from './OrderPage';
import { EscrowPage } from './EscrowPage';
import { BookingsPage } from './BookingsPage';
import { BookingPage } from './BookingPage';
import { WalletPage } from './WalletPage';
import { DepositPage } from './DepositPage';
import { WithdrawPage } from './WithdrawPage';
import { TransferPage } from './TransferPage';
import { HistoryPage } from './HistoryPage';
import { EconomyPage } from './EconomyPage';
import { NationPage } from './NationPage';
import { QuestsPage } from './QuestsPage';
import { QuestPage } from './QuestPage';
import { LeaderboardPage } from './LeaderboardPage';
import { ReferralPage } from './ReferralPage';
import { SalesPage } from './SalesPage';
import { SellerPage } from './SellerPage';
import { AddProductPage } from './AddProductPage';
import { CrmPage } from './CrmPage';
import { ProfilePage } from './ProfilePage';
import { SettingsPage } from './SettingsPage';

export const PAGE_COMPONENTS: Readonly<Record<PageId, ComponentType>> = {
  home: HomePage,
  onboarding: OnboardingPage,
  notifications: NotificationsPage,
  help: HelpPage,
  charter: CharterPage,
  market: MarketPage,
  product: ProductPage,
  checkout: CheckoutPage,
  orders: OrdersPage,
  order: OrderPage,
  escrow: EscrowPage,
  bookings: BookingsPage,
  booking: BookingPage,
  wallet: WalletPage,
  deposit: DepositPage,
  withdraw: WithdrawPage,
  transfer: TransferPage,
  history: HistoryPage,
  economy: EconomyPage,
  nation: NationPage,
  quests: QuestsPage,
  quest: QuestPage,
  leaderboard: LeaderboardPage,
  referral: ReferralPage,
  sales: SalesPage,
  seller: SellerPage,
  addproduct: AddProductPage,
  crm: CrmPage,
  profile: ProfilePage,
  settings: SettingsPage,
};
