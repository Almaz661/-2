import React, { useState } from 'react';
import { Bot, Play, Trash2 } from 'lucide-react';
import { getNotificationPermission, requestNotificationPermission } from '../../services/notificationService';
import { Btn, Card } from '../ui/mercury';
import { assistantStore, useAssistantSignals, useAssistantState } from './useAssistant';

const RULES = [
  'Документ истекает в течение 14 дней — задача «Продлить…»',
  'Лекарство заканчивается или просрочено — в список «Аптека»',
  'ТО, страховка, обслуживание, прививка питомца — задача за срок',
  'С 15 по 25 число не переданы показания — задача «Передать показания»',
  'Горящие сроки — системное уведомление раз в день',
  'Каждое утро — сообщение с планом уборки на день',
];

const Toggle: React.FC<{ checked: boolean; onChange: (v: boolean) => void; label: string; hint: string }> = ({
  checked,
  onChange,
  label,
  hint,
}) => (
  <label className="flex items-start justify-between gap-4 py-3 cursor-pointer">
    <span>
      <span className="block text-sm font-medium text-[var(--text)]">{label}</span>
      <span className="block text-xs text-[var(--muted)] mt-0.5">{hint}</span>
    </span>
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative shrink-0 w-11 h-6 rounded-full transition-colors ${checked ? 'bg-[var(--accent)]' : 'bg-[var(--line-strong)]'}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-[var(--surface)] shadow transition-transform ${checked ? 'translate-x-5' : ''}`}
      />
    </button>
  </label>
);

/** Настройки главного ассистента: что он делает сам, уведомления, журнал действий. */
export const AssistantSettingsCard: React.FC = () => {
  const { settings, log } = useAssistantState();
  const signals = useAssistantSignals();
  const [perm, setPerm] = useState(getNotificationPermission());

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-full bg-[var(--accent-soft)] text-[var(--accent)] grid place-items-center">
            <Bot className="w-5 h-5" />
          </span>
          <div>
            <h3 className="font-semibold text-[16px] text-[var(--text)]">Главный ассистент</h3>
            <p className="text-xs text-[var(--muted)]">
              Следит за всеми разделами сразу. Сейчас замечено: {signals.length}
            </p>
          </div>
        </div>
        <Btn size="sm" icon={<Play className="w-3.5 h-3.5" />} onClick={() => window.dispatchEvent(new Event('dbh:assistant-run'))}>
          Проверить сейчас
        </Btn>
      </div>

      <div className="divide-y divide-[var(--line)]">
        <Toggle
          label="Действовать самостоятельно"
          hint="Создавать задачи и покупки по правилам ниже. Каждое действие — один раз, без дублей."
          checked={settings.autoActions}
          onChange={(v) => assistantStore.setSettings({ ...settings, autoActions: v })}
        />
        <Toggle
          label="Уведомления о горящих сроках"
          hint={
            perm === 'granted'
              ? 'Уведомления разрешены на этом устройстве.'
              : perm === 'unsupported'
              ? 'Это устройство не поддерживает уведомления из браузера.'
              : 'Нужно разрешение браузера.'
          }
          checked={settings.notify}
          onChange={async (v) => {
            assistantStore.setSettings({ ...settings, notify: v });
            if (v && perm === 'default') {
              await requestNotificationPermission();
              setPerm(getNotificationPermission());
            }
          }}
        />
        <Toggle
          label="Утреннее сообщение с планом уборки"
          hint="Каждое утро: зона дня, подробная и редкая уборка, сезонные дела."
          checked={settings.morning}
          onChange={(v) => assistantStore.setSettings({ ...settings, morning: v })}
        />
        {settings.morning && (
          <label className="flex items-center justify-between gap-4 py-3">
            <span className="text-sm text-[var(--text)]">Во сколько присылать</span>
            <input
              type="time"
              value={settings.morningTime}
              onChange={(e) => assistantStore.setSettings({ ...settings, morningTime: e.target.value || '08:00' })}
              className="px-3 py-1.5 rounded-lg bg-[var(--surface-2)] border border-[var(--line)] text-sm text-[var(--text)]"
            />
          </label>
        )}
      </div>

      <div>
        <h4 className="text-[14px] font-medium text-[var(--muted)] mb-2">Правила</h4>
        <ul className="space-y-1.5 text-sm text-[var(--text-2)] list-disc pl-5">
          {RULES.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-[14px] font-medium text-[var(--muted)]">Что ассистент сделал сам</h4>
          {log.length > 0 && (
            <Btn size="sm" variant="ghost" icon={<Trash2 className="w-3.5 h-3.5" />} onClick={() => assistantStore.clearLog()}>
              Очистить
            </Btn>
          )}
        </div>
        {log.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">Пока ничего.</p>
        ) : (
          <ul className="max-h-56 overflow-y-auto divide-y divide-[var(--line)] rounded-xl border border-[var(--line)]">
            {log.map((e, i) => (
              <li key={i} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                <span className="text-[var(--text)]">{e.text}</span>
                <span className="text-xs text-[var(--muted)] tabular-nums shrink-0">
                  {new Date(e.at).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
};
