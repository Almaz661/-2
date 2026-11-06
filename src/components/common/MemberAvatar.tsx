import React, { useState, useEffect } from 'react';
import { FamilyMember } from '../../types';
import { getMemberInitials } from '../../utils/imageUtils';

export type AvatarSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

interface MemberAvatarProps {
  member?: FamilyMember | null;
  name?: string;
  avatarUrl?: string;
  colorHex?: string;
  size?: AvatarSize;
  className?: string;
  title?: string;
}

const SIZE_CLASSES: Record<AvatarSize, { container: string; text: string }> = {
  '2xs': { container: 'w-3.5 h-3.5', text: 'text-[8px]' },
  'xs': { container: 'w-4 h-4', text: 'text-[9px]' },
  'sm': { container: 'w-5 h-5', text: 'text-[10px]' },
  'md': { container: 'w-7 h-7', text: 'text-xs' },
  'lg': { container: 'w-10 h-10', text: 'text-sm font-bold' },
  'xl': { container: 'w-12 h-12', text: 'text-base font-bold' },
  '2xl': { container: 'w-16 h-16', text: 'text-xl font-bold' },
};

export const MemberAvatar: React.FC<MemberAvatarProps> = ({
  member,
  name: fallbackName,
  avatarUrl: fallbackAvatar,
  colorHex: fallbackHex,
  size = 'md',
  className = '',
  title,
}) => {
  const [imageError, setImageError] = useState(false);

  const name = member?.name || fallbackName || 'Член семьи';
  const rawAvatar = member?.avatar ?? fallbackAvatar;

  // Сбрасываем ошибку при смене фотографии
  useEffect(() => {
    setImageError(false);
  }, [rawAvatar]);

  // Отклоняем чужие внешние фотографии и ссылки (Unsplash, сторонние URL)
  // Разрешены только загруженные локальные фото (data:image... или blob:)
  const isExternalUrl = Boolean(
    rawAvatar &&
      (rawAvatar.startsWith('http://') ||
        rawAvatar.startsWith('https://') ||
        rawAvatar.includes('unsplash.com'))
  );

  const hasValidAvatar = Boolean(
    rawAvatar &&
      rawAvatar.trim() !== '' &&
      !isExternalUrl &&
      !imageError
  );

  const hexColor = member?.color?.hex || fallbackHex || '#E11D48';
  const sizeConfig = SIZE_CLASSES[size] || SIZE_CLASSES.md;
  const initials = getMemberInitials(name);

  if (hasValidAvatar && rawAvatar) {
    return (
      <img
        src={rawAvatar}
        alt={name}
        title={title || name}
        onError={() => setImageError(true)}
        className={`${sizeConfig.container} rounded-full object-cover shrink-0 select-none shadow-2xs ${className}`}
      />
    );
  }

  // Нейтральный аватар с инициалами участника в индивидуальных цветах
  return (
    <div
      title={title || name}
      style={{
        backgroundColor: `${hexColor}15`, // Мягкий гармоничный фон
        color: hexColor,
        borderColor: `${hexColor}35`,
      }}
      className={`${sizeConfig.container} rounded-full flex items-center justify-center font-bold tracking-tight border shrink-0 select-none ${sizeConfig.text} ${className}`}
    >
      <span>{initials}</span>
    </div>
  );
};
