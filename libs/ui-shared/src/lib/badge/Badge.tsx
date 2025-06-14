import { FC } from 'react';

export type BadgeVariant = 'outlined' | 'ghost';

export interface BadgeProps {
    text: string;
    variant: BadgeVariant;
    className?: string;
}

const Badge: FC<BadgeProps> = ({ variant, text, className }) => {
    const getStyles = (variant: BadgeVariant) => {
        switch (variant) {
            case 'outlined':
                return 'bg-[#FDFDFD] text-[#616161] border border-[#D5D9EB]';
            case 'ghost':
                return 'bg-[#ECECEC] text-[#8F8F8F]';
        }
    }
  return (
    <div className={`rounded-[16px] px-[8px] py-[2px] text-[12px] font-medium ${getStyles(variant)} ${className}`}>
        {text}
    </div>
  );
};


export default Badge;
