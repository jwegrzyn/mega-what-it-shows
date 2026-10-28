<script lang="ts">
  import reports from '#lib/data/reports-4471.json';
  import notes from '#lib/data/desk-notes.json';
  import issues from '#lib/data/issues-4471.json';
  import type { Report } from '#lib/kb/causes';
  import { tenantOf } from '#lib/kb/locales';
  import { splitTicket, type Problem } from '#lib/kb/split';

  let { ticket }: { ticket: number } = $props();

  const split = $derived(splitTicket(reports as Report[], ticket, tenantOf, notes.oneDayMove));
  const issueOf = (p: Problem) => (issues as Record<string, { number: number; url: string; title: string; state: string; why: string }>)[p];
  const list = (n: Record<string, number>) =>
    Object.entries(n)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `${k} ×${v}`)
      .join(' · ');
</script>

<p class="sum">
  <strong>{(reports as Report[]).length}</strong> rows in the export ·
  <strong>{split.merged.length}</strong> unique reports in #{ticket} ·
  <strong>{split.groups.length}</strong> problems
  {#if split.unplaced.length}· <strong>{split.unplaced.length}</strong> unplaced{/if}
</p>

<table>
  <thead>
    <tr><th>problem</th><th>reports</th><th>ticket</th><th>state</th><th>tenants</th><th>channels</th><th>intake tagged</th><th>seen</th></tr>
  </thead>
  <tbody>
    {#each split.groups as g (g.problem)}
      {@const issue = issueOf(g.problem)}
      <tr>
        <td><code>{g.problem}</code></td>
        <td><strong>{g.reports.length}</strong></td>
        <td>{#if issue}<a href={issue.url}>#{issue.number}</a>{:else}<span class="none">none</span>{/if}</td>
        <td class:open={issue?.state === 'open'} title={issue?.why}>{issue?.state ?? '—'}</td>
        <td>{g.tenants}</td>
        <td class="small">{list(g.channels)}</td>
        <td class="small">{list(g.taggedAs)}</td>
        <td class="small">{g.firstSeen} → {g.lastSeen}</td>
      </tr>
    {/each}
  </tbody>
</table>

{#if split.groups.some((g) => g.problem === 'shift')}
  <p class="small">
    The <code>shift</code> reports are also counted under their tenant's cause, the way the desk files them,
    so the rows add up to more than {split.merged.length}.
  </p>
{/if}

<style>
  .sum { font-size: 1.05rem; }
  .small { color: var(--muted); font-size: 0.85em; }
  .none, .open { color: var(--warn); font-weight: 600; }
</style>
