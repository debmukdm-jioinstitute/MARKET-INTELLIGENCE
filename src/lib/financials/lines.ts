/**
 * Statement line definitions for the exchange XBRL results filings.
 *
 * Tag names come straight from the NSE / BSE "Ind-AS" and "Banking" results
 * taxonomies (both the legacy `in-bse-fin` and the 2025+ `in-capmkt` prefix
 * use the same element names). A line is only ever shown when the filing
 * itself carries that tag: nothing is inferred, estimated or filled in.
 *
 * Units: money values are stored in INR crore (the filing carries absolute
 * rupees); per-share values stay in INR per share.
 */

export type Layout = "general" | "bank";
export type LineUnit = "cr" | "ps";
export type LineKind = "item" | "total";

export type LineDef = {
  tag: string;
  label: string;
  kind?: LineKind;
  unit?: LineUnit;
  /** Cash-flow lines only: how the sign is normalised for display. "out" => always shown as a negative number. */
  flow?: "out" | "in";
};

const L = (tag: string, label: string, kind: LineKind = "item", unit: LineUnit = "cr"): LineDef => ({ tag, label, kind, unit });
const T = (tag: string, label: string): LineDef => L(tag, label, "total");
const PS = (tag: string, label: string): LineDef => L(tag, label, "item", "ps");
const OUT = (tag: string, label: string): LineDef => ({ tag, label, flow: "out", unit: "cr", kind: "item" });
const IN = (tag: string, label: string): LineDef => ({ tag, label, flow: "in", unit: "cr", kind: "item" });

export const GENERAL_PL: LineDef[] = [
  L("RevenueFromOperations", "Revenue from operations"),
  L("OtherIncome", "Other income"),
  T("Income", "Total income"),
  L("CostOfMaterialsConsumed", "Cost of materials consumed"),
  L("PurchasesOfStockInTrade", "Purchases of stock-in-trade"),
  L("ChangesInInventoriesOfFinishedGoodsWorkInProgressAndStockInTrade", "Change in inventories"),
  L("EmployeeBenefitExpense", "Employee benefit expense"),
  L("FinanceCosts", "Finance costs"),
  L("DepreciationDepletionAndAmortisationExpense", "Depreciation and amortisation"),
  L("OtherExpenses", "Other expenses"),
  T("Expenses", "Total expenses"),
  T("ProfitBeforeExceptionalItemsAndTax", "Profit before exceptional items and tax"),
  L("ExceptionalItemsBeforeTax", "Exceptional items"),
  T("ProfitBeforeTax", "Profit before tax"),
  L("CurrentTax", "Current tax"),
  L("DeferredTax", "Deferred tax"),
  L("TaxExpense", "Total tax expense"),
  L("ProfitLossFromDiscontinuedOperationsAfterTax", "Profit from discontinued operations"),
  L("ShareOfProfitLossOfAssociatesAndJointVenturesAccountedForUsingEquityMethod", "Share of associates and JVs"),
  T("ProfitLossForPeriod", "Net profit"),
  L("ProfitOrLossAttributableToOwnersOfParent", "Attributable to owners"),
  L("ProfitOrLossAttributableToNonControllingInterests", "Attributable to minority interest"),
  L("OtherComprehensiveIncomeNetOfTaxes", "Other comprehensive income"),
  T("ComprehensiveIncomeForThePeriod", "Total comprehensive income"),
  PS("BasicEarningsLossPerShareFromContinuingAndDiscontinuedOperations", "Basic EPS (INR)"),
  PS("DilutedEarningsLossPerShareFromContinuingAndDiscontinuedOperations", "Diluted EPS (INR)"),
  PS("BasicEarningsLossPerShareFromContinuingOperations", "Basic EPS, continuing (INR)"),
  PS("DilutedEarningsLossPerShareFromContinuingOperations", "Diluted EPS, continuing (INR)"),
  L("PaidUpValueOfEquityShareCapital", "Paid-up equity share capital"),
  PS("FaceValueOfEquityShareCapital", "Face value per share (INR)"),
];

export const GENERAL_BS: LineDef[] = [
  L("PropertyPlantAndEquipment", "Property, plant and equipment"),
  L("CapitalWorkInProgress", "Capital work-in-progress"),
  L("InvestmentProperty", "Investment property"),
  L("Goodwill", "Goodwill"),
  L("OtherIntangibleAssets", "Other intangible assets"),
  L("IntangibleAssetsUnderDevelopment", "Intangibles under development"),
  L("InvestmentsAccountedForUsingEquityMethod", "Equity-accounted investments"),
  L("NoncurrentInvestments", "Non-current investments"),
  L("TradeReceivablesNoncurrent", "Trade receivables (non-current)"),
  L("LoansNoncurrent", "Loans (non-current)"),
  L("OtherNoncurrentFinancialAssets", "Other non-current financial assets"),
  L("DeferredTaxAssetsNet", "Deferred tax assets (net)"),
  L("OtherNoncurrentAssets", "Other non-current assets"),
  T("NoncurrentAssets", "Total non-current assets"),
  L("Inventories", "Inventories"),
  L("CurrentInvestments", "Current investments"),
  L("TradeReceivablesCurrent", "Trade receivables"),
  L("CashAndCashEquivalents", "Cash and cash equivalents"),
  L("BankBalanceOtherThanCashAndCashEquivalents", "Other bank balances"),
  L("LoansCurrent", "Loans (current)"),
  L("OtherCurrentFinancialAssets", "Other current financial assets"),
  L("CurrentTaxAssets", "Current tax assets"),
  L("OtherCurrentAssets", "Other current assets"),
  T("CurrentAssets", "Total current assets"),
  T("Assets", "Total assets"),
  L("EquityShareCapital", "Equity share capital"),
  L("OtherEquity", "Other equity (reserves)"),
  L("EquityAttributableToOwnersOfParent", "Equity attributable to owners"),
  L("NonControllingInterest", "Minority interest"),
  T("Equity", "Total equity"),
  L("BorrowingsNoncurrent", "Borrowings (non-current)"),
  L("TradePayablesNoncurrent", "Trade payables (non-current)"),
  L("OtherNoncurrentFinancialLiabilities", "Other non-current financial liabilities"),
  L("ProvisionsNoncurrent", "Provisions (non-current)"),
  L("DeferredTaxLiabilitiesNet", "Deferred tax liabilities (net)"),
  L("OtherNoncurrentLiabilities", "Other non-current liabilities"),
  T("NoncurrentLiabilities", "Total non-current liabilities"),
  L("BorrowingsCurrent", "Borrowings (current)"),
  L("TradePayablesCurrent", "Trade payables"),
  L("OtherCurrentFinancialLiabilities", "Other current financial liabilities"),
  L("OtherCurrentLiabilities", "Other current liabilities"),
  L("ProvisionsCurrent", "Provisions (current)"),
  L("CurrentTaxLiabilities", "Current tax liabilities"),
  T("CurrentLiabilities", "Total current liabilities"),
  T("Liabilities", "Total liabilities"),
  T("EquityAndLiabilities", "Total equity and liabilities"),
];

/**
 * Cash flow: only totals and lines whose meaning is unambiguous across filers.
 * The detailed indirect-method adjustments are tagged with inconsistent signs
 * by different companies, so they are deliberately not reproduced.
 */
export const GENERAL_CF: LineDef[] = [
  L("AdjustmentsForReconcileProfitLoss", "Non-cash and other adjustments to profit"),
  T("CashFlowsFromUsedInOperations", "Cash generated from operations"),
  OUT("IncomeTaxesPaidRefundClassifiedAsOperatingActivities", "Income taxes paid"),
  T("CashFlowsFromUsedInOperatingActivities", "Net cash from operating activities"),
  OUT("PurchaseOfPropertyPlantAndEquipmentClassifiedAsInvestingActivities", "Purchase of property, plant and equipment"),
  OUT("PurchaseOfIntangibleAssetsClassifiedAsInvestingActivities", "Purchase of intangible assets"),
  IN("ProceedsFromSalesOfPropertyPlantAndEquipmentClassifiedAsInvestingActivities", "Proceeds from sale of PPE"),
  T("CashFlowsFromUsedInInvestingActivities", "Net cash from investing activities"),
  IN("ProceedsFromIssuingSharesClassifiedAsFinancingActivities", "Proceeds from issuing shares"),
  IN("ProceedsFromBorrowingsClassifiedAsFinancingActivities", "Proceeds from borrowings"),
  OUT("RepaymentsOfBorrowingsClassifiedAsFinancingActivities", "Repayment of borrowings"),
  OUT("PaymentsToAcquireOrRedeemEntitysShares", "Share buyback"),
  OUT("PaymentsOfLeaseLiabilitiesClassifiedAsFinancingActivities", "Lease payments"),
  OUT("InterestPaidClassifiedAsFinancingActivities", "Interest paid"),
  OUT("DividendsPaidClassifiedAsFinancingActivities", "Dividends paid"),
  T("CashFlowsFromUsedInFinancingActivities", "Net cash from financing activities"),
  T("IncreaseDecreaseInCashAndCashEquivalentsBeforeEffectOfExchangeRateChanges", "Net change in cash before FX"),
  L("EffectOfExchangeRateChangesOnCashAndCashEquivalents", "Effect of exchange rate changes"),
  T("IncreaseDecreaseInCashAndCashEquivalents", "Net change in cash"),
];

export const BANK_PL: LineDef[] = [
  L("InterestOrDiscountOnAdvancesOrBills", "Interest on advances"),
  L("RevenueOnInvestments", "Income on investments"),
  L("InterestOnBalancesWithReserveBankOfIndiaAndOtherInterBankFunds", "Interest on RBI and inter-bank balances"),
  L("OtherInterest", "Other interest"),
  T("InterestEarned", "Interest earned"),
  L("OtherIncome", "Other income"),
  T("Income", "Total income"),
  L("InterestExpended", "Interest expended"),
  L("EmployeesCost", "Employee cost"),
  L("OtherOperatingExpenses", "Other operating expenses"),
  L("OperatingExpenses", "Operating expenses"),
  T("ExpenditureExcludingProvisionsAndContingencies", "Expenditure before provisions"),
  T("OperatingProfitBeforeProvisionAndContingencies", "Operating profit before provisions"),
  L("ProvisionsOtherThanTaxAndContingencies", "Provisions and contingencies"),
  L("ExceptionalItems", "Exceptional items"),
  T("ProfitLossFromOrdinaryActivitiesBeforeTax", "Profit before tax"),
  L("TaxExpense", "Tax expense"),
  T("ProfitLossFromOrdinaryActivitiesAfterTax", "Profit after tax"),
  L("ProfitLossOfMinorityInterest", "Minority interest"),
  L("ShareOfProfitLossOfAssociates", "Share of associates"),
  T("ProfitLossAfterTaxesMinorityInterestAndShareOfProfitLossOfAssociates", "Net profit attributable to owners"),
  PS("BasicEarningsPerShareAfterExtraordinaryItems", "Basic EPS (INR)"),
  PS("DilutedEarningsPerShareAfterExtraordinaryItems", "Diluted EPS (INR)"),
  L("PaidUpValueOfEquityShareCapital", "Paid-up equity share capital"),
  PS("FaceValueOfEquityShareCapital", "Face value per share (INR)"),
];

export const BANK_BS: LineDef[] = [
  L("Capital", "Capital"),
  L("ReservesAndSurplus", "Reserves and surplus"),
  L("MinorityInterest", "Minority interest"),
  L("Deposits", "Deposits"),
  L("Borrowings", "Borrowings"),
  L("OtherLiabilitiesAndProvisions", "Other liabilities and provisions"),
  T("CapitalAndLiabilities", "Total capital and liabilities"),
  L("CashAndBalancesWithReserveBankOfIndia", "Cash and balances with RBI"),
  L("BalancesWithBanksAndMoneyAtCallAndShortNotice", "Balances with banks and call money"),
  L("Investments", "Investments"),
  L("Advances", "Advances"),
  L("FixedAssets", "Fixed assets"),
  L("OtherAssets", "Other assets"),
  T("Assets", "Total assets"),
];

export const LAYOUT_LINES: Record<Layout, { pl: LineDef[]; bs: LineDef[]; cf: LineDef[] }> = {
  general: { pl: GENERAL_PL, bs: GENERAL_BS, cf: GENERAL_CF },
  bank: { pl: BANK_PL, bs: BANK_BS, cf: [] },
};

export const lineLabel = (layout: Layout, tag: string): string | null => {
  const l = LAYOUT_LINES[layout];
  return [...l.pl, ...l.bs, ...l.cf].find((d) => d.tag === tag)?.label ?? null;
};
