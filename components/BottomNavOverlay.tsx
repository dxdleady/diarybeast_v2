'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCurrentAccount, useDisconnectWallet } from '@mysten/dapp-kit';

interface MenuItem {
  href?: string;
  iconPath: string;
  colorFilter: string;
  onClick?: () => void;
}

export function BottomNavOverlay() {
  const pathname = usePathname();
  const router = useRouter();
  const currentAccount = useCurrentAccount();
  const { mutate: disconnect } = useDisconnectWallet();

  // Don't show menu on auth page, onboarding, or when not connected
  if (!currentAccount || pathname === '/' || pathname === '/onboarding') {
    return null;
  }

  const handleLogout = async () => {
    // Disconnect wallet first
    disconnect();

    // Small delay to ensure disconnect completes
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Navigate to home
    router.push('/');
  };

  const leftMenuItems: MenuItem[] = [
    {
      href: '/insights',
      iconPath: '/assets/get-hidden-insights-about-your-thoughts--tamagochi.svg',
      colorFilter:
        'brightness(0) saturate(100%) invert(56%) sepia(93%) saturate(6472%) hue-rotate(245deg) brightness(99%) contrast(97%)', // purple
    },
    {
      href: '/shop',
      iconPath: '/assets/tamagochi-shop.svg',
      colorFilter:
        'brightness(0) saturate(100%) invert(78%) sepia(61%) saturate(464%) hue-rotate(45deg) brightness(103%) contrast(106%)', // green
    },
    {
      href: '/profile',
      iconPath: '/assets/pet-profile-tamagochi.svg',
      colorFilter:
        'brightness(0) saturate(100%) invert(56%) sepia(93%) saturate(6472%) hue-rotate(245deg) brightness(99%) contrast(97%)', // purple
    },
  ];

  const centerMenuItem: MenuItem = {
    href: '/diary',
    iconPath: '/assets/diary-beast-tamagochi.svg',
    colorFilter:
      'brightness(0) saturate(100%) invert(70%) sepia(98%) saturate(2476%) hue-rotate(160deg) brightness(103%) contrast(101%)', // cyan
  };

  const rightMenuItems: MenuItem[] = [
    {
      href: '/info',
      iconPath: '/assets/tamagochi-info-about-gamification.svg',
      colorFilter:
        'brightness(0) saturate(100%) invert(80%) sepia(48%) saturate(1000%) hue-rotate(2deg) brightness(104%) contrast(101%)', // gold
    },
    {
      href: '/leaderboard',
      iconPath: '/assets/tamagochi-leaderboard.svg',
      colorFilter:
        'brightness(0) saturate(100%) invert(50%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(80%) contrast(90%)', // gray (locked)
      onClick: undefined, // locked, no action
    },
    {
      iconPath: '/assets/logout_icon.svg',
      colorFilter:
        'brightness(0) saturate(100%) invert(27%) sepia(94%) saturate(7471%) hue-rotate(347deg) brightness(98%) contrast(105%)', // red
      onClick: handleLogout,
    },
  ];

  const renderMenuItem = (item: MenuItem, index: number, isDiary: boolean = false) => {
    const isActive = item.href && pathname === item.href;
    const isLocked = item.href === '/leaderboard';

    if (item.href && !isLocked) {
      return (
        <Link
          key={item.href}
          href={item.href}
          className="flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-all duration-200 pb-1 hover:scale-110"
        >
          <div
            className={`flex flex-col items-center justify-center gap-0.5 rounded-full border transition-all duration-300 px-2 py-2 ${isActive ? 'scale-110' : ''}`}
            style={{
              borderColor: isActive ? 'rgba(0, 229, 255, 1)' : 'transparent',
              backgroundColor: isActive ? 'rgba(0, 229, 255, 0.4)' : 'transparent',
              boxShadow: isActive ? '0 0 20px rgba(0, 229, 255, 0.6)' : 'none',
            }}
          >
            <div className="w-14 h-14 flex items-center justify-center">
              <img
                src={item.iconPath}
                alt=""
                className={`w-14 h-14 object-contain drop-shadow-[0_4px_8px_rgba(0,0,0,0.3)] transition-all duration-300 ${isActive ? 'scale-110' : ''}`}
                style={{
                  filter: item.colorFilter,
                }}
              />
            </div>
            <span
              className={`text-[8px] font-mono uppercase tracking-wider drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] transition-all duration-300 ${isActive ? 'text-primary' : 'text-white/80'}`}
            >
              {isDiary
                ? 'Diary'
                : item.href === '/insights'
                  ? 'Insights'
                  : item.href === '/shop'
                    ? 'Shop'
                    : item.href === '/profile'
                      ? 'Profile'
                      : item.href === '/info'
                        ? 'Info'
                        : ''}
            </span>
          </div>
        </Link>
      );
    } else if (isLocked) {
      return (
        <div
          key={item.href}
          className="flex flex-col items-center justify-center gap-0.5 pb-1 cursor-not-allowed opacity-50"
        >
          <div className="flex flex-col items-center justify-center gap-0.5 rounded-full border border-transparent transition-all duration-300 px-2 py-2">
            <div className="w-14 h-14 flex items-center justify-center">
              <img
                src={item.iconPath}
                alt=""
                className="w-14 h-14 object-contain drop-shadow-[0_4px_8px_rgba(0,0,0,0.3)]"
                style={{
                  filter: item.colorFilter,
                }}
              />
            </div>
            <span className="text-[8px] font-mono text-white/80 uppercase tracking-wider drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
              Leaderboard
            </span>
          </div>
        </div>
      );
    } else {
      return (
        <button
          key={index}
          onClick={item.onClick}
          className="flex flex-col items-center justify-center gap-0.5 pb-1 cursor-pointer transition-all duration-200 bg-transparent hover:scale-110"
        >
          <div className="flex flex-col items-center justify-center gap-0.5 rounded-full border border-transparent transition-all duration-300 px-2 py-2">
            <div className="w-14 h-14 flex items-center justify-center">
              <img
                src={item.iconPath}
                alt=""
                className="w-14 h-14 object-contain drop-shadow-[0_4px_8px_rgba(0,0,0,0.3)]"
                style={{
                  filter: item.colorFilter,
                }}
              />
            </div>
            <span className="text-[8px] font-mono text-white/80 uppercase tracking-wider drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
              {item.iconPath.includes('gamification')
                ? 'Info'
                : item.iconPath.includes('logout')
                  ? 'Exit'
                  : ''}
            </span>
          </div>
        </button>
      );
    }
  };

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
      <div className="pointer-events-auto">
        <div
          className="inline-flex flex-row items-end justify-center gap-0 px-3 py-2 rounded-[50px] border border-white/10"
          style={{
            backdropFilter: 'blur(24px) saturate(180%)',
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            boxShadow:
              '0 0 30px rgba(0, 229, 255, 0.3), 0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 1px rgba(255, 255, 255, 0.1)',
          }}
        >
          {/* Left menu items */}
          {leftMenuItems.map((item, index) => renderMenuItem(item, index))}

          {/* Center Diary item */}
          {renderMenuItem(centerMenuItem, -1, true)}

          {/* Right menu items */}
          {rightMenuItems.map((item, index) => renderMenuItem(item, index + 100))}
        </div>
      </div>
    </div>
  );
}
