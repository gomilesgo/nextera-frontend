import type { Investment, InvestmentDetail } from "@nextera/contracts";

export type InvestmentSummary = {
  activeCount: number;
  pendingCount: number;
  maturedCount: number;
  investedPaise: number;
  creditedNetPaise: number;
  tdsPaise: number;
  nextCredit: { date: string; paise: number; planName: string; investmentId: string } | null;
  complete: boolean;
};

export const SUMMARY_DETAIL_LIMIT = 24;

export function summaryTargets(investments: Investment[]): Investment[] {
  return investments.filter((item) => item.status === "active" || item.status === "matured").slice(0, SUMMARY_DETAIL_LIMIT);
}

export function summarise(investments: Investment[], details: InvestmentDetail[]): InvestmentSummary {
  const counted = investments.filter((item) => item.status === "active" || item.status === "matured").length;
  let creditedNetPaise = 0;
  let tdsPaise = 0;
  let nextCredit: InvestmentSummary["nextCredit"] = null;
  for (const detail of details) {
    creditedNetPaise += detail.growth.creditedNetPaise;
    tdsPaise += detail.growth.tdsPaise;
    const { nextCreditDate, nextCreditPaise } = detail.growth;
    if (detail.investment.status === "active" && nextCreditDate && nextCreditPaise !== null) {
      if (!nextCredit || nextCreditDate < nextCredit.date) {
        nextCredit = {
          date: nextCreditDate,
          paise: nextCreditPaise,
          planName: detail.investment.planName,
          investmentId: detail.investment.id,
        };
      }
    }
  }
  return {
    activeCount: investments.filter((item) => item.status === "active").length,
    pendingCount: investments.filter((item) => item.status === "pending_payment").length,
    maturedCount: investments.filter((item) => item.status === "matured").length,
    investedPaise: investments.filter((item) => item.status === "active").reduce((sum, item) => sum + item.principalPaise, 0),
    creditedNetPaise,
    tdsPaise,
    nextCredit,
    complete: details.length === counted,
  };
}

export async function mapLimited<T, R>(items: T[], limit: number, run: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await run(items[index] as T);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}
