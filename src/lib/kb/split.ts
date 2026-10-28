// How #4471 splits into the problems it holds. causes.ts tells parser from hint by tenant and channel,
// and the desk counts them that way. The one-day moves are a third problem that no tenant rule can
// find: the desk lists them by id (desk-notes.json) and files them under their tenant's cause. This
// file keeps that count and gives them a group of their own as well, so they are counted in both.
import { causeOf, uniqueById, type Cause, type Report, type Tenant } from '#lib/kb/causes';

export type Problem = Cause | 'shift';

export type ProblemGroup = {
  problem: Problem;
  reports: Report[];
  tenants: number;
  channels: Record<string, number>;
  taggedAs: Record<string, number>;
  firstSeen: string;
  lastSeen: string;
};

const tally = (rs: Report[], key: (r: Report) => string) =>
  rs.reduce<Record<string, number>>((n, r) => ({ ...n, [key(r)]: (n[key(r)] ?? 0) + 1 }), {});

export function splitTicket(
  reports: Report[],
  ticket: number,
  tenantOf: (r: Report) => Tenant | undefined,
  shiftIds: readonly string[],
): { merged: Report[]; groups: ProblemGroup[]; unplaced: Report[] } {
  const merged = uniqueById(reports).filter((r) => r.mergedInto === ticket);
  const by = new Map<Problem, Report[]>();
  const unplaced: Report[] = [];
  for (const r of merged) {
    const p = causeOf(r, tenantOf(r));
    if (p === null) unplaced.push(r);
    else by.set(p, [...(by.get(p) ?? []), r]);
  }
  const shifted = merged.filter((r) => shiftIds.includes(r.id));
  if (shifted.length) by.set('shift', shifted);
  const groups = [...by.entries()]
    .map(([problem, rs]) => {
      const days = rs.map((r) => r.receivedAt.slice(0, 10)).sort();
      return {
        problem,
        reports: rs,
        tenants: new Set(rs.map((r) => r.tenant)).size,
        channels: tally(rs, (r) => r.channel),
        taggedAs: tally(rs, (r) => r.meta.intakeTag),
        firstSeen: days[0],
        lastSeen: days[days.length - 1],
      };
    })
    .sort((a, b) => b.reports.length - a.reports.length);
  return { merged, groups, unplaced };
}
