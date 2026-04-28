import { Link, useLocation } from 'react-router-dom';
import { 
  Home, 
  MessageSquare, 
  Users, 
  Moon, 
  User as UserIcon,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function BottomNav() {
  const location = useLocation();

  const navItems = [
    { icon: Home, label: 'Home', path: '/' },
    { icon: MessageSquare, label: 'Support', path: '/counselor-chat' },
    { icon: Moon, label: 'Relax', path: '/relax' },
    { icon: Users, label: 'Peers', path: '/peers' },
    { icon: UserIcon, label: 'Profile', path: '/profile' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-16 items-center justify-around border-t border-slate-200 bg-white/95 px-2 backdrop-blur-md safe-area-bottom">
      {navItems.map((item) => {
        const isActive = location.pathname === item.path;
        return (
          <Link
            key={item.path}
            to={item.path}
            className={cn(
              "flex flex-col items-center justify-center gap-1 transition-all duration-300",
              isActive ? "text-cyan-600" : "text-slate-400 hover:text-slate-600"
            )}
          >
            <div className={cn(
              "relative flex h-8 w-8 items-center justify-center rounded-xl transition-all duration-300",
              isActive && "bg-cyan-50 shadow-sm shadow-cyan-100"
            )}>
              <item.icon size={20} strokeWidth={isActive ? 2.5 : 1.5} />
            </div>
            <span className="text-[10px] font-medium tracking-wide">
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
