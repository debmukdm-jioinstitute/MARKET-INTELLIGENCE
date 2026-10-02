/** True while `next build` is prerendering pages (not at request time). */
export function isNextProductionBuild(): boolean {
  return process.env.NEXT_PHASE === "phase-production-build";
}
