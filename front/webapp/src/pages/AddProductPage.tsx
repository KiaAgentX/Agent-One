import { useState } from 'react';
import { Btn, Card, Field, Page, PageHead, useLang, useT } from '../components/ui';
import { api } from '../lib/api';
import { navigate } from '../lib/router';
import { validateDinarAmount } from '@dropagentx/nation';
import { PRODUCT_CATEGORIES, type ProductCategory } from '../lib/demo';

export function AddProductPage() {
  const t = useT();
  const lang = useLang();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<ProductCategory>('digital');
  const [price, setPrice] = useState('');
  const [desc, setDesc] = useState('');
  const [err, setErr] = useState<string | null>(null);

  const submit = () => {
    const n = Number(price || 0);
    try {
      validateDinarAmount(n);
    } catch {
      setErr(t('add.invalidPrice'));
      return;
    }
    if (title.trim().length < 3) {
      setErr(t('add.invalidPrice'));
      return;
    }
    api
      .addProduct({ title: title.trim(), category, price: n, desc: desc.trim() })
      .then(() => navigate('/seller'));
  };

  return (
    <Page>
      <PageHead title={t('seller.add')} onBack={() => navigate('/seller')} />
      <Field label={t('add.title')}>
        <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
      </Field>
      <Field label={t('add.category')}>
        <div className="chips">
          {PRODUCT_CATEGORIES.map((c) => (
            <button key={c} type="button" className={category === c ? 'chip chip-picked' : 'chip'} onClick={() => setCategory(c)}>
              {t(`cat.${c}`)}
            </button>
          ))}
        </div>
      </Field>
      <Field label={t('common.amount')} hint={err ?? undefined}>
        <input
          className="input"
          inputMode="numeric"
          dir="ltr"
          value={price}
          onChange={(e) => {
            setPrice(e.target.value.replace(/[^\d]/g, ''));
            setErr(null);
          }}
        />
      </Field>
      <Field label={t('add.desc')}>
        <textarea className="input" rows={3} value={desc} onChange={(e) => setDesc(e.target.value)} />
      </Field>
      <Btn onClick={submit} disabled={title.trim().length < 3 || price === ''}>
        {t('common.submit')}
      </Btn>
    </Page>
  );
}
