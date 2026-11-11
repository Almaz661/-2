import React, { useEffect, useState } from 'react';
import { Building2, Check, Home, Plus, X } from 'lucide-react';
import { useHousehold } from '../../context/HouseholdContext';
import { FLAG_LABELS, FlagGroup, GROUP_TITLES, HomeProfile, getHomeProfile, saveHomeProfile } from '../../utils/homeProfile';
import { Btn } from '../ui/mercury';

const GROUP_ORDER: FlagGroup[] = ['where', 'rooms', 'tech', 'gadgets', 'energy', 'safety', 'family'];

const fresh = (propId: string): HomeProfile => {
  const p = getHomeProfile(propId);
  // Для новой анкеты стартуем с пустых отметок, чтобы человек выбрал сам
  return p.completed ? p : { ...p, flags: Object.fromEntries(Object.keys(p.flags).map((k) => [k, false])) as HomeProfile['flags'] };
};

/** Анкета «Профиль дома»: для каждого объекта своя. Заполняется один раз, можно дополнить своим. */
export const HomeProfileForm: React.FC<{ onSaved?: () => void; compact?: boolean }> = ({ onSaved, compact }) => {
  const { properties, activePropertyId, setActivePropertyId, addProperty } = useHousehold();
  const startId = activePropertyId === 'all' ? properties[0]?.id || 'apartment' : activePropertyId;
  const [propId, setPropId] = useState(startId);
  const [p, setP] = useState<HomeProfile>(() => fresh(startId));
  const [saved, setSaved] = useState(false);
  const [customText, setCustomText] = useState('');
  const [newObj, setNewObj] = useState<string | null>(null);

  useEffect(() => {
    setP(fresh(propId));
    setSaved(false);
  }, [propId]);

  const toggle = (id: keyof HomeProfile['flags']) => setP((x) => ({ ...x, flags: { ...x.flags, [id]: !x.flags[id] } }));
  const chip = (on: boolean) =>
    `inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-sm border transition active:scale-[0.97] ${
      on ? 'bg-[var(--accent)] border-[var(--accent)] text-white' : 'bg-[var(--surface)] border-[var(--line)] text-[var(--text)] hover:bg-[var(--surface-3)]'
    }`;
  const addCustom = () => {
    const t = customText.trim();
    if (!t || p.custom.includes(t)) return;
    setP({ ...p, custom: [...p.custom, t] });
    setCustomText('');
  };

  return (
    <div className="space-y-5">
      {/* Объекты: у каждого свой профиль */}
      <div>
        <div className="text-[14px] text-[var(--muted)] mb-2">Для какого жилья</div>
        <div className="flex flex-wrap gap-2">
          {properties.map((pr) => (
            <button
              key={pr.id}
              type="button"
              className={chip(propId === pr.id)}
              aria-pressed={propId === pr.id}
              onClick={() => {
                setPropId(pr.id);
                setActivePropertyId(pr.id);
              }}
            >
              {getHomeProfile(pr.id).completed && <Check className="w-4 h-4" />}
              {pr.name}
            </button>
          ))}
          {newObj === null ? (
            <button type="button" className={chip(false)} onClick={() => setNewObj('')}>
              <Plus className="w-4 h-4" /> Добавить жильё
            </button>
          ) : (
            <span className="inline-flex items-center gap-2">
              <input
                value={newObj}
                onChange={(e) => setNewObj(e.target.value)}
                placeholder="Например: Дом мамы"
                autoFocus
                className="px-4 py-2.5 rounded-full text-sm bg-[var(--surface-2)] border border-[var(--line)] text-[var(--text)]"
              />
              <Btn
                size="sm"
                variant="primary"
                onClick={() => {
                  const name = (newObj || '').trim();
                  if (!name) return;
                  addProperty({
                    name,
                    shortName: name,
                    address: '',
                    managementCompany: { name: '', phone: '', dispatchPhone: '' },
                    waterShutoff: { location: '', instructions: '', hasAquaStop: false },
                    electricPanel: { location: '', mainBreaker: '', notes: '' },
                    firstAidLocation: '',
                    backupKeysLocation: '',
                  });
                  setNewObj(null);
                }}
              >
                Добавить
              </Btn>
              <button type="button" aria-label="Отмена" onClick={() => setNewObj(null)} className="w-9 h-9 grid place-items-center rounded-full text-[var(--muted)] hover:bg-[var(--surface-3)]">
                <X className="w-4 h-4" />
              </button>
            </span>
          )}
        </div>
      </div>

      {GROUP_ORDER.map((g) => (
        <div key={g}>
          <div className="text-[14px] text-[var(--muted)] mb-2">{GROUP_TITLES[g]}</div>
          <div className="flex flex-wrap gap-2">
            {g === 'where' && (
              <>
                <button type="button" className={chip(p.type === 'apartment')} onClick={() => setP({ ...p, type: 'apartment' })} aria-pressed={p.type === 'apartment'}>
                  <Building2 className="w-4 h-4" /> Квартира
                </button>
                <button type="button" className={chip(p.type === 'house')} onClick={() => setP({ ...p, type: 'house' })} aria-pressed={p.type === 'house'}>
                  <Home className="w-4 h-4" /> Частный дом
                </button>
              </>
            )}
            {FLAG_LABELS.filter((f) => f.group === g).map((f) => (
              <button key={f.id} type="button" className={chip(p.flags[f.id])} onClick={() => toggle(f.id)} aria-pressed={p.flags[f.id]} title={f.hint}>
                {p.flags[f.id] && <Check className="w-4 h-4" />}
                {f.label}
              </button>
            ))}
          </div>
        </div>
      ))}

      {/* Своё — чего нет в списке */}
      <div>
        <div className="text-[14px] text-[var(--muted)] mb-2">Своё — чего нет в списке</div>
        <div className="flex flex-wrap items-center gap-2">
          {p.custom.map((c) => (
            <span key={c} className="inline-flex items-center gap-1.5 pl-4 pr-1.5 py-1.5 rounded-full text-sm bg-[var(--accent)] text-white">
              {c}
              <button type="button" aria-label={`Убрать: ${c}`} onClick={() => setP({ ...p, custom: p.custom.filter((x) => x !== c) })} className="w-7 h-7 grid place-items-center rounded-full hover:bg-white/20">
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          ))}
          <input
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addCustom()}
            placeholder="Например: бассейн, аквариум, сауна"
            className="flex-1 min-w-[200px] px-4 py-2.5 rounded-full text-sm bg-[var(--surface-2)] border border-[var(--line)] text-[var(--text)]"
          />
          <Btn size="sm" icon={<Plus className="w-4 h-4" />} onClick={addCustom}>
            Добавить
          </Btn>
        </div>
      </div>

      {!compact && (
        <p className="text-[14px] text-[var(--muted)]">
          По ответам приложение уберёт лишнее из чек-листов, карты уборки, техосмотра и плана: например, без посудомойки не будет напоминаний про её фильтр,
          без подвала — его осмотра. У каждого жилья свой профиль. Изменить можно в любой момент.
        </p>
      )}

      <div className="flex items-center justify-end gap-3">
        {saved && <span className="text-sm text-emerald-600">Сохранено ✓</span>}
        <Btn
          variant="primary"
          icon={<Check className="w-4 h-4" />}
          onClick={() => {
            saveHomeProfile({ ...p, completed: true }, propId);
            setSaved(true);
            onSaved?.();
          }}
        >
          Сохранить
        </Btn>
      </div>
    </div>
  );
};
