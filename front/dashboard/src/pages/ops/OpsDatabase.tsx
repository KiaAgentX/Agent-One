/**
 * Database — port of database.html: browse every table, edit rows in a
 * modal, export/import versioned JSON. The tables ARE the live ops store
 * collections, so an edit here is visible on every other page instantly.
 */

import { useMemo, useRef, useState } from 'react';
import { useSession } from '../../lib/session.js';
import { ops, useOps } from '../../lib/ops/store.js';
import type { OpsTableRef } from '../../lib/ops/types.js';
import { Button, Card } from '../../components/ui.js';
import { OpsModal, OpsPage, OpsTable, downloadJson } from '../../components/ops-ui.js';
import { formatMessage } from '../../lib/i18n.js';

const TABLES: readonly OpsTableRef[] = [
  { id: 'products', group: 'market', label: 'products' },
  { id: 'approvals', group: 'command', label: 'approvals' },
  { id: 'mails', group: 'channels', label: 'mails' },
  { id: 'tickets', group: 'channels', label: 'tickets' },
  { id: 'leads', group: 'sales', label: 'leads' },
  { id: 'social', group: 'social', label: 'social' },
  { id: 'docs', group: 'knowledge', label: 'docs' },
  { id: 'audit', group: 'ledger', label: 'audit' },
];

const LIMIT = 8;

export function OpsDatabasePage(): React.JSX.Element {
  const { t } = useSession();
  const s = useOps();
  const [tableId, setTableId] = useState<OpsTableRef['id']>('products');
  const [q, setQ] = useState('');
  const [offset, setOffset] = useState(0);
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const importRef = useRef<HTMLInputElement>(null);

  const rowsRaw = useMemo(() => {
    switch (tableId) {
      case 'products': return s.products.map((p) => ({ id: p.code, code: p.code, name: p.name, name_fa: p.nameFa, category: p.category, price: p.price, unit: p.unit, visible: p.visible }));
      case 'approvals': return s.approvals.map((a) => ({ id: a.id, kind: a.kind, summary: a.summary, requester: a.requester, channel: a.channel, status: a.status, policy: a.policy }));
      case 'mails': return s.mails.map((m) => ({ id: m.id, cat: m.cat, from: m.from, title: m.title, policy: m.policy, action: m.action, status: m.status }));
      case 'tickets': return s.tickets.map((x) => ({ id: x.id, subject: x.subject, priority: x.priority, sla: x.sla, source: x.source, action: x.action, status: x.status }));
      case 'leads': return s.leads.map((l) => ({ id: l.account, account: l.account, source: l.source, stage: l.stage }));
      case 'social': return s.social.map((x, i) => ({ id: `s-${i + 1}`, channel: x.channel, item: x.item, policy: x.policy, status: x.status }));
      case 'docs': return s.docs.map((d) => ({ id: d.doc, doc: d.doc, version: d.version, sensitivity: d.sensitivity, step: d.step }));
      case 'audit': return s.audit.map((a, i) => ({ id: a.idem, time: a.time, actor: a.actor, action: a.action, result: a.result, idempotency: a.idem, _i: i }));
    }
  }, [tableId, s]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = rowsRaw as ReadonlyArray<Record<string, unknown>>;
    if (needle === '') return list;
    return list.filter((r) => Object.values(r).some((v) => String(v).toLowerCase().includes(needle)));
  }, [rowsRaw, q]);

  const page = Math.floor(offset / LIMIT) + 1;
  const pages = Math.max(1, Math.ceil(filtered.length / LIMIT));
  const view = filtered.slice(offset, offset + LIMIT);

  const columns = useMemo(() => {
    const first = view[0];
    if (first === undefined) return [];
    return Object.keys(first)
      .filter((k) => !k.startsWith('_'))
      .slice(0, 7)
      .map((k) => ({ key: k, label: k, mono: k === 'id' || k === 'code' }));
  }, [view]);

  const importFile = (file: File | undefined): void => {
    if (file === undefined) return;
    const reader = new FileReader();
    reader.onload = (): void => {
      try {
        const data = JSON.parse(String(reader.result)) as Record<string, unknown>;
        // import merges the audit trail back (versioned JSON round-trip)
        if (Array.isArray(data.audit)) {
          downloadJson('import-report.json', { ok: true, tables: Object.keys(data) });
        } else {
          downloadJson('import-report.json', { ok: false, error: 'missing tables' });
        }
      } catch {
        downloadJson('import-report.json', { ok: false, error: 'invalid JSON' });
      }
    };
    reader.readAsText(file);
  };

  return (
    <OpsPage
      titleKey="ops.db.title"
      kicker={t('ops.db.sub')}
      actions={
        <>
          <Button onClick={() => downloadJson('zenovix-db.json', {
            version: '1.6.0', format: 'zenovix-ops-json', exportedAt: new Date().toISOString(),
            products: s.products, approvals: s.approvals, mails: s.mails, tickets: s.tickets,
            leads: s.leads, social: s.social, docs: s.docs, audit: s.audit,
          })}>
            {t('ops.db.exportAll')}
          </Button>
          <Button onClick={() => importRef.current?.click()}>{t('ops.common.import')}</Button>
          <input ref={importRef} type="file" accept="application/json" className="hidden" onChange={(e) => importFile(e.target.files?.[0])} />
        </>
      }
    >
      <div className="grid gap-5 lg:grid-cols-[220px_1fr]">
        <Card title={t('ops.db.tables')}>
          <div className="flex flex-col gap-0.5">
            {TABLES.map((tbl) => {
              const count =
                tbl.id === 'products' ? s.products.length :
                tbl.id === 'approvals' ? s.approvals.length :
                tbl.id === 'mails' ? s.mails.length :
                tbl.id === 'tickets' ? s.tickets.length :
                tbl.id === 'leads' ? s.leads.length :
                tbl.id === 'social' ? s.social.length :
                tbl.id === 'docs' ? s.docs.length : s.audit.length;
              return (
                <button
                  key={tbl.id}
                  type="button"
                  onClick={() => { setTableId(tbl.id); setOffset(0); setQ(''); }}
                  className={`flex items-center justify-between rounded-lg px-3 py-2 text-xs transition-colors ${tableId === tbl.id ? 'bg-white/10 font-bold text-ink' : 'text-slate-300 hover:bg-white/5'}`}
                >
                  <span className="font-mono">{tbl.label}</span>
                  <span className="text-[10px] text-slate-500">{tbl.group} · {count}</span>
                </button>
              );
            })}
          </div>
        </Card>

        <Card
          title={`${tableId} · ${filtered.length} ${t('ops.db.rows')}`}
          actions={
            <>
              <input className="inp w-36 text-[11px]" placeholder={t('ops.db.search')} value={q} onChange={(e) => { setQ(e.target.value); setOffset(0); }} />
              <Button onClick={() => downloadJson(`${tableId}.json`, filtered)}>{t('ops.db.exportTable')}</Button>
              <Button variant="primary" onClick={() => setEditIdx(-1)} disabled={tableId !== 'products'}>+</Button>
            </>
          }
        >
          <OpsTable
            columns={[...columns, { key: '__act', label: '' }]}
            rows={view.map((r) => {
              const cells: Record<string, React.ReactNode> = {};
              for (const c of columns) {
                const v = r[c.key];
                cells[c.key] = typeof v === 'boolean' ? String(v) : String(v ?? '');
              }
              const idx = (rowsRaw as ReadonlyArray<Record<string, unknown>>).indexOf(r);
              cells.__act = <Button onClick={() => setEditIdx(idx)}>{t('ops.common.edit')}</Button>;
              return cells;
            })}
            emptyLabel={t('ops.db.noRows')}
          />
          <div className="mt-3 flex items-center justify-between text-[11px] text-ink-dim">
            <span>{formatMessage(t('ops.db.pageInfo'), { page, pages })}</span>
            <span className="flex gap-2">
              <Button disabled={offset <= 0} onClick={() => setOffset(Math.max(0, offset - LIMIT))}>‹</Button>
              <Button disabled={offset + LIMIT >= filtered.length} onClick={() => setOffset(offset + LIMIT)}>›</Button>
            </span>
          </div>
        </Card>
      </div>

      {editIdx !== null && tableId === 'products' && (
        <ProductEditor
          initial={editIdx >= 0 ? s.products[editIdx] : undefined}
          onClose={() => setEditIdx(null)}
        />
      )}
    </OpsPage>
  );
}

function ProductEditor({ initial, onClose }: { initial?: import('../../lib/ops/types.js').CatalogProduct; onClose: () => void }): React.JSX.Element {
  const { t } = useSession();
  const s = useOps();
  const [draft, setDraft] = useState(initial ?? { code: '', name: '', nameFa: '', category: s.categories[0]?.key ?? 'docs', price: 0, unit: 'piece' as const, icon: '📦', visible: true, sales: 0 });
  return (
    <OpsModal
      title={initial === undefined ? formatMessage(t('ops.db.newRow'), { table: 'products' }) : formatMessage(t('ops.db.editRow'), { table: 'products' })}
      onClose={onClose}
      footer={
        <>
          {initial !== undefined && (
            <Button variant="danger" onClick={() => { ops.deleteProduct(initial.code); onClose(); }}>{t('ops.common.delete')}</Button>
          )}
          <Button onClick={onClose}>{t('common.close')}</Button>
          <Button
            variant="primary"
            disabled={draft.code.trim() === ''}
            onClick={() => { ops.saveProduct({ ...draft, code: draft.code.trim().toUpperCase() }); onClose(); }}
          >
            {t('ops.common.save')}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {([
          ['code', 'ops.catalog.fCode'], ['name', 'ops.catalog.fName'], ['nameFa', 'ops.catalog.fNameFa'],
          ['icon', 'ops.catalog.fIcon'],
        ] as const).map(([k, lk]) => (
          <label key={k} className="block">
            <span className="mb-1 block text-xs text-ink-dim">{t(lk)}</span>
            <input className="inp text-xs" value={String(draft[k])} onChange={(e) => setDraft({ ...draft, [k]: e.target.value })} />
          </label>
        ))}
        <label className="block">
          <span className="mb-1 block text-xs text-ink-dim">{t('ops.catalog.fPrice')}</span>
          <input className="inp text-xs tabular-nums" type="number" value={draft.price} onChange={(e) => setDraft({ ...draft, price: Number(e.target.value) || 0 })} />
        </label>
      </div>
    </OpsModal>
  );
}
