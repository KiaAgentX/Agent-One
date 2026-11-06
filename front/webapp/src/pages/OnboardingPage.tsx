import { useState } from 'react';
import { Badge, Btn, Card, Page, PageHead, useLang, useT } from '../components/ui';
import { LANGS, setLang } from '../lib/i18n';
import { navigate } from '../lib/router';

export function OnboardingPage() {
  const t = useT();
  const lang = useLang();
  const [step, setStep] = useState(1);
  const [picked, setPicked] = useState<'fa' | 'en'>(lang);

  return (
    <Page>
      <PageHead title={t('page.onboarding')} sub={`${t('onb.step')} ${step} ${t('common.of')} 3`} />

      {step === 1 && (
        <Card>
          <h2 className="sec-title">{t('onb.lang')}</h2>
          <div className="grid2">
            {LANGS.map((l) => (
              <button
                key={l}
                type="button"
                className={picked === l ? 'chip chip-picked' : 'chip'}
                onClick={() => {
                  setPicked(l);
                  setLang(l);
                }}
              >
                {l === 'fa' ? 'فارسی' : 'English'}
              </button>
            ))}
          </div>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <h2 className="sec-title">{t('onb.profile')}</h2>
          <p className="sub">{t('profile.tgId')}: ✓</p>
          <p className="sub">{t('profile.account')}: KIA-*</p>
        </Card>
      )}

      {step === 3 && (
        <Card>
          <h2 className="sec-title">{t('onb.first')}</h2>
          <p className="sub">{t('onb.hintQuest')}</p>
          <Badge tone="ok">+500 Đ</Badge>
        </Card>
      )}

      <div className="actions">
        {step > 1 && (
          <Btn variant="ghost" onClick={() => setStep((s) => s - 1)}>
            {t('common.back')}
          </Btn>
        )}
        {step < 3 ? (
          <Btn onClick={() => setStep((s) => s + 1)}>{t('common.confirm')}</Btn>
        ) : (
          <Btn onClick={() => navigate('/quests')}>{t('onb.done')}</Btn>
        )}
      </div>
    </Page>
  );
}
