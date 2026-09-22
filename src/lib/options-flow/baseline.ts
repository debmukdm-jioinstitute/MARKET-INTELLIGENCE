import { mean, stdev } from "@/lib/analytics";
import type { ActiveStrikeOiChange, OptionsFlowRecord, SourcedField, TickerBaseline } from "@/lib/options-flow/types";

const MIN_HISTORY_FOR_BASELINE = 5;

function fieldValue<T>(field: SourcedField<T>): T | null {
  return field.status === "ok" ? field.value : null;
}

/**
 * All arithmetic the Analysis Agent will need lives here, computed deterministically
 * in code — never left to the LLM to compute or estimate. The LLM only narrates these
 * numbers under a strict no-interpretation system prompt.
 */
export function computeTickerBaseline(today: OptionsFlowRecord, history: OptionsFlowRecord[]): TickerBaseline {
  const volume = fieldValue<number>(today.volume);
  const volumeAvg30 = fieldValue<number>(today.volumeAvg30);
  const volumeRatio = volume != null && volumeAvg30 != null && volumeAvg30 > 0 ? volume / volumeAvg30 : null;

  const callsToday = fieldValue<number>(today.callsVolume);
  const putsToday = fieldValue<number>(today.putsVolume);
  const optionsVolumeToday = callsToday != null && putsToday != null ? callsToday + putsToday : null;
  const callPutRatioToday = callsToday != null && putsToday != null && putsToday > 0 ? callsToday / putsToday : null;

  const historyOptionsVolumes: number[] = [];
  const historyCallPutRatios: number[] = [];
  for (const h of history) {
    const c = fieldValue<number>(h.callsVolume);
    const p = fieldValue<number>(h.putsVolume);
    if (c != null && p != null) {
      historyOptionsVolumes.push(c + p);
      if (p > 0) historyCallPutRatios.push(c / p);
    }
  }

  const haveEnoughHistory = historyOptionsVolumes.length >= MIN_HISTORY_FOR_BASELINE;
  const optionsVolumeAvg30 = haveEnoughHistory ? mean(historyOptionsVolumes) : null;
  const optionsVolumeSd = haveEnoughHistory ? stdev(historyOptionsVolumes) : null;
  const optionsVolumeZ =
    optionsVolumeToday != null && optionsVolumeAvg30 != null && optionsVolumeSd != null && optionsVolumeSd > 0
      ? (optionsVolumeToday - optionsVolumeAvg30) / optionsVolumeSd
      : null;
  const callPutRatioAvg30 = historyCallPutRatios.length >= MIN_HISTORY_FOR_BASELINE ? mean(historyCallPutRatios) : null;

  const activeStrikes = fieldValue<ActiveStrikeOiChange[]>(today.activeStrikeOiChanges) ?? [];
  const oiOpenedStrikes = activeStrikes.filter((s) => s.change > 0);
  const oiClosedStrikes = activeStrikes.filter((s) => s.change < 0);

  const priceChangePct = fieldValue<number>(today.priceChangePct);
  const earningsNote = fieldValue<string>(today.earningsEvent);
  const corporateActionNote = fieldValue<string>(today.corporateActionEvent);
  const upcomingEventNote =
    earningsNote != null || corporateActionNote != null
      ? [earningsNote, corporateActionNote].filter((n): n is string => n != null).join(" ")
      : null;

  // Doc's exact flag condition: unusual options volume opened new positions, and price
  // has not moved correspondingly. "Unusual" is relative to the ticker's own history, not
  // absolute size — hence the z-score gate rather than a raw volume threshold.
  const candidateFlag =
    optionsVolumeZ != null &&
    optionsVolumeZ >= 1.5 &&
    oiOpenedStrikes.length > 0 &&
    priceChangePct != null &&
    Math.abs(priceChangePct) < 1.5;

  return {
    symbol: today.symbol,
    name: today.name,
    historyDays: history.length,
    volumeRatio,
    optionsVolumeToday,
    optionsVolumeAvg30,
    optionsVolumeZ,
    callPutRatioToday,
    callPutRatioAvg30,
    oiOpenedStrikes,
    oiClosedStrikes,
    priceChangePct,
    upcomingEventNote,
    candidateFlag,
  };
}
