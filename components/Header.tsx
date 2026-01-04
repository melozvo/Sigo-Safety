
import React from 'react';

interface HeaderProps {
  title: string;
  onBack?: () => void;
  rightAction?: React.ReactNode;
}

const Header: React.FC<HeaderProps> = ({ title, onBack, rightAction }) => {
  return (
    <header className="sticky top-0 z-50 flex items-center bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-sm p-4 pb-2 border-b border-gray-200 dark:border-white/5 h-16 shrink-0">
      {onBack && (
        <button 
          onClick={onBack}
          className="text-gray-900 dark:text-white flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-white/10 active:scale-95 transition-all"
        >
          <span className="material-symbols-outlined text-[24px]">arrow_back</span>
        </button>
      )}
      <div className="flex-1 text-center truncate px-4">
        <h2 className="text-gray-900 dark:text-white text-lg font-bold leading-tight tracking-tight">{title}</h2>
      </div>
      <div className="size-10 shrink-0 flex items-center justify-center">
        {rightAction || <div className="w-10" />}
      </div>
    </header>
  );
};

export default Header;
