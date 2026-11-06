/**
 * Catalog — port of catalog.html: products the bot sells, categories,
 * optional Persian translations, units and show/hide. Full CRUD over the
 * ops store (persisted), matching "edit and save, no redeploy".
 */

import { useState } from 'react';
import { useSession } from '../../lib/session.js';
import { ops, useOps } from '../../lib/ops/store.js';
import { SEED_UNITS } from '../../lib/ops/seed.js';
import type { CatalogProduct } from '../../lib/ops/types.js';
import { Badge, Button, Card, Field } from '../../components/ui.js';
import { OpsModal, OpsPage, OpsTable } from '../../components/ops-ui.js';

const EMPTY_PRODUCT: CatalogProduct = {
  code: '', name: '', nameFa: '', category: 'lubricants',
  price: 0, unit: 'piece', icon: '📦', visible: true, sales: 0,
};

export function OpsCatalogPage(): React.JSX.Element {
  const { t } = useSession();
  const s = useOps();
  const [editing, setEditing] = useState<CatalogProduct | null>(null);
  const [catEditing, setCatEditing] = useState<{ key: string; name: string; icon: string } | null>(null);

  const save = (): void => {
    if (editing === null) return;
    if (editing.code.trim() === '') return;
    ops.saveProduct({ ...editing, code: editing.code.trim().toUpperCase() });
    setEditing(null);
  };

  return (
    <OpsPage
      titleKey="ops.catalog.title"
      kicker={t('ops.catalog.sub')}
      actions={
        <Button variant="primary" onClick={() => setEditing({ ...EMPTY_PRODUCT })}>+ {t('ops.catalog.newProduct')}</Button>
      }
    >
      <Card title={t('ops.catalog.products')}>
        <OpsTable
          columns={[
            { key: 'icon', label: t('ops.catalog.fIcon') },
            { key: 'code', label: t('ops.catalog.fCode'), mono: true },
            { key: 'name', label: t('ops.catalog.fName') },
            { key: 'nameFa', label: t('ops.catalog.fNameFa') },
            { key: 'category', label: t('ops.catalog.fCategory') },
            { key: 'price', label: t('ops.catalog.fPrice'), num: true },
            { key: 'unit', label: t('ops.catalog.fUnit') },
            { key: 'visible', label: '' },
            { key: 'act', label: '' },
          ]}
          rows={s.products.map((p) => ({
            icon: <span aria-hidden>{p.icon}</span>,
            code: p.code,
            name: p.name,
            nameFa: p.nameFa === '' ? <span className="text-slate-600">—</span> : p.nameFa,
            category: <Badge tone="cyan">{p.category}</Badge>,
            price: p.price === 0 ? t('ops.market.free') : `$${p.price}`,
            unit: p.unit,
            visible: p.visible
              ? <Badge tone="mint">{t('ops.catalog.show')}</Badge>
              : <Badge tone="neutral">{t('ops.catalog.hide')}</Badge>,
            act: (
              <span className="flex justify-end gap-1.5">
                <Button onClick={() => setEditing({ ...p })}>{t('ops.common.edit')}</Button>
                <Button variant="danger" onClick={() => ops.deleteProduct(p.code)}>{t('ops.common.delete')}</Button>
              </span>
            ),
          }))}
        />
      </Card>

      <Card title={t('ops.catalog.categories')}>
        <div className="flex flex-wrap gap-2">
          {s.categories.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => setCatEditing({ key: c.key, name: c.name, icon: c.icon })}
              className={`glass inline-flex items-center gap-2 px-3 py-2 text-xs transition-colors hover:bg-white/10 ${c.active ? '' : 'opacity-50'}`}
            >
              <span aria-hidden>{c.icon}</span>
              <span className="font-medium">{c.name}</span>
              <span className="font-mono text-[10px] text-slate-500">{c.key}</span>
            </button>
          ))}
          <Button onClick={() => setCatEditing({ key: '', name: '', icon: '📁' })}>+ {t('ops.catalog.newCategory')}</Button>
        </div>
        <p className="mt-3 text-[11px] text-ink-dim">{t('ops.catalog.translationsHint')}</p>
      </Card>

      {editing !== null && (
        <OpsModal
          title={editing.code === '' ? t('ops.catalog.newProduct') : `${t('ops.common.edit')} · ${editing.code}`}
          onClose={() => setEditing(null)}
          footer={
            <>
              <Button onClick={() => setEditing(null)}>{t('common.cancel')}</Button>
              <Button variant="primary" onClick={save}>{t('ops.common.save')}</Button>
            </>
          }
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label={t('ops.catalog.fCode')}>
              <input className="inp font-mono" value={editing.code} onChange={(e) => setEditing({ ...editing, code: e.target.value })} />
            </Field>
            <Field label={t('ops.catalog.fIcon')}>
              <input className="inp" value={editing.icon} onChange={(e) => setEditing({ ...editing, icon: e.target.value })} />
            </Field>
            <Field label={t('ops.catalog.fName')}>
              <input className="inp" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
            </Field>
            <Field label={t('ops.catalog.fNameFa')}>
              <input className="inp" dir="rtl" value={editing.nameFa} onChange={(e) => setEditing({ ...editing, nameFa: e.target.value })} />
            </Field>
            <Field label={t('ops.catalog.fCategory')}>
              <select className="inp" value={editing.category} onChange={(e) => setEditing({ ...editing, category: e.target.value })}>
                {s.categories.map((c) => (
                  <option key={c.key} value={c.key}>{c.name}</option>
                ))}
              </select>
            </Field>
            <Field label={t('ops.catalog.fUnit')}>
              <select className="inp" value={editing.unit} onChange={(e) => setEditing({ ...editing, unit: e.target.value as CatalogProduct['unit'] })}>
                {SEED_UNITS.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </Field>
            <Field label={t('ops.catalog.fPrice')}>
              <input className="inp tabular-nums" type="number" min={0} value={editing.price} onChange={(e) => setEditing({ ...editing, price: Number(e.target.value) || 0 })} />
            </Field>
            <Field label=" ">
              <label className="flex items-center gap-2 text-xs text-slate-300">
                <input type="checkbox" checked={editing.visible} onChange={(e) => setEditing({ ...editing, visible: e.target.checked })} />
                {t('ops.catalog.show')}
              </label>
            </Field>
          </div>
        </OpsModal>
      )}

      {catEditing !== null && (
        <OpsModal
          title={t('ops.catalog.newCategory')}
          onClose={() => setCatEditing(null)}
          footer={
            <>
              <Button onClick={() => setCatEditing(null)}>{t('common.cancel')}</Button>
              <Button
                variant="primary"
                onClick={() => {
                  if (catEditing.key.trim() === '') return;
                  ops.saveCategory({ key: catEditing.key.trim().toLowerCase(), name: catEditing.name.trim() || catEditing.key, icon: catEditing.icon || '📁', active: true });
                  setCatEditing(null);
                }}
              >
                {t('ops.catalog.saveCat')}
              </Button>
            </>
          }
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Field label="key">
              <input className="inp font-mono" value={catEditing.key} onChange={(e) => setCatEditing({ ...catEditing, key: e.target.value })} />
            </Field>
            <Field label="name">
              <input className="inp" value={catEditing.name} onChange={(e) => setCatEditing({ ...catEditing, name: e.target.value })} />
            </Field>
            <Field label="icon">
              <input className="inp" value={catEditing.icon} onChange={(e) => setCatEditing({ ...catEditing, icon: e.target.value })} />
            </Field>
          </div>
        </OpsModal>
      )}
    </OpsPage>
  );
}
