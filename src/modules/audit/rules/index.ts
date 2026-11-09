import type { Rule, MultiSubscriptionRule } from "../types";
import { seatsExceedTeamRule } from "./seats_exceed_team";
import { annualVsMonthlyRule } from "./annual_vs_monthly";
import { planDowngradeRule } from "./plan_downgrade";
import { unusedFreeTierRule } from "./unused_free_tier";
import { missingOwnerRule } from "./missing_owner";
import { priceIncreaseRule } from "./price_increase";
import { renewalUpcomingRule } from "./renewal_upcoming";
import { budgetOverrunRule } from "./budget_overrun";
import { duplicateCategoryRule } from "./duplicate_category";

export const SINGLE_SUBSCRIPTION_RULES: Rule[] = [
  seatsExceedTeamRule,
  planDowngradeRule,
  annualVsMonthlyRule,
  unusedFreeTierRule,
  priceIncreaseRule,
  renewalUpcomingRule,
  missingOwnerRule,
];

export const MULTI_SUBSCRIPTION_RULES: MultiSubscriptionRule[] = [
  duplicateCategoryRule,
  budgetOverrunRule,
];

export {
  seatsExceedTeamRule,
  annualVsMonthlyRule,
  planDowngradeRule,
  unusedFreeTierRule,
  missingOwnerRule,
  priceIncreaseRule,
  renewalUpcomingRule,
  budgetOverrunRule,
  duplicateCategoryRule,
};

