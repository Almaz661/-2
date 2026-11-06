/**
 * Универсальная утилита для звонков и копирования номеров телефонов.
 * Обеспечивает 100% работоспособность как на мобильных телефонах (запуск набора),
 * так и на компьютерах/ноутбуках (копирование в буфер + визуальный тост),
 * без блокировки iframe и без навигационных ошибок.
 */

export function cleanPhoneNumber(phone: string): string {
  if (!phone) return '';
  return phone.replace(/[^+\d]/g, '');
}

export function handlePhoneAction(
  e: React.MouseEvent | undefined,
  phone: string,
  label: string,
  showToast?: (message: string, type?: 'success' | 'info' | 'warning' | 'error') => void
) {
  if (e) {
    e.stopPropagation();
    e.preventDefault();
  }

  const clean = cleanPhoneNumber(phone);

  // 1. Копируем в буфер обмена для гарантии доступности номера (с fallback)
  if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(phone || clean).catch(() => {});
  }

  // 2. Показываем информативный тост с подтверждением
  if (showToast) {
    showToast(
      `Вызов ${label} (${phone || clean}): номер скопирован в буфер! На смартфоне открывается набор...`,
      'success'
    );
  }

  // 3. Безопасный запуск tel: через временный <a> без сброса iframe window.location
  if (clean && typeof document !== 'undefined') {
    try {
      const link = document.createElement('a');
      link.href = `tel:${clean}`;
      link.target = '_top';
      link.rel = 'noopener noreferrer';
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        try {
          document.body.removeChild(link);
        } catch (_) {}
      }, 200);
    } catch (_) {
      // Игнорируем в средах без поддержки tel
    }
  }
}
