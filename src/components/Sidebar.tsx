import { Link, useLocation } from 'react-router-dom';
import { 
  Home, 
  MessageSquare, 
  Users, 
  Heart, 
  User as UserIcon, 
  LogOut,
  Lock,
  Sparkles
} from 'lucide-react';
import { auth } from '../lib/firebase';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface SidebarProps {
  user: any;
  profile: any;
}

export default function Sidebar({ user, profile }: SidebarProps) {
  const location = useLocation();

  const navItems = [
    { icon: Home, label: 'Dashboard', path: '/' },
    { icon: Sparkles, label: 'CalmSphere AI', path: '/ai-chat' },
    { icon: MessageSquare, label: 'Counselor', path: '/counselor-chat' },
    { icon: Heart, label: 'Wellness', path: '/wellness' },
    { icon: Users, label: 'Peers', path: '/peers' },
    { icon: UserIcon, label: 'Profile', path: '/profile' },
  ];

  return (
    <aside className="flex h-full w-64 flex-col border-r border-slate-200 bg-white/80 backdrop-blur-md">
      <div className="flex shrink-0 items-center gap-2 px-6 py-8">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-200">
          <Lock size={24} />
        </div>
        <span className="text-xl font-bold tracking-tight text-slate-900">Sentinel</span>
      </div>

      <nav className="flex-1 space-y-1 px-4">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
              location.pathname === item.path
                ? "bg-blue-50 text-blue-600"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            )}
          >
            <item.icon size={20} />
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="mt-auto border-t border-slate-100 p-4">
        <div className="flex items-center gap-3 px-2 py-3">
          <Avatar className="h-10 w-10 border-2 border-white shadow-sm">
            <AvatarImage src={user.photoURL} />
            <AvatarFallback className="bg-blue-100 text-blue-700">
              {profile?.name?.charAt(0) || user.email?.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col overflow-hidden">
            <span className="truncate text-sm font-semibold text-slate-900">
              {profile?.name || 'User'}
            </span>
            <span className="truncate text-xs text-slate-500">
              {profile?.role === 'student' ? 'Student' : 'Counselor'}
            </span>
          </div>
        </div>
        <Button
          variant="ghost"
          className="mt-2 w-full justify-start gap-3 text-slate-500 hover:bg-red-50 hover:text-red-600"
          onClick={() => auth.signOut()}
        >
          <LogOut size={18} />
          Sign Out
        </Button>
      </div>
    </aside>
  );
}
