import {
  Home,
  BookOpen,
  MessageCircle,
  GraduationCap,
  BarChart3,
  User,
  Layers,
  Mic,
  Theater,
  Trophy,
  Settings,
} from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useLocation } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import { useAuth } from '@/hooks/useAuth';

const mainItems = [
  { title: 'Dashboard', url: '/', icon: Home },
  { title: 'Lessons', url: '/lessons', icon: BookOpen },
  { title: 'Flashcards', url: '/flashcards', icon: Layers },
  { title: 'Pronunciation', url: '/pronunciation', icon: Mic },
];

const aiItems = [
  { title: 'AI Chat', url: '/ai-chat', icon: MessageCircle },
  { title: 'AI Teacher', url: '/ai-teacher', icon: GraduationCap },
  { title: 'Scenarios', url: '/scenarios', icon: Theater },
];

const trackingItems = [
  { title: 'Progress', url: '/progress', icon: BarChart3 },
  { title: 'Achievements', url: '/achievements', icon: Trophy },
  { title: 'Profile', url: '/profile', icon: User },
  { title: 'Admin', url: '/admin', icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const location = useLocation();
  const { profile } = useAuth();

  const isActive = (path: string) => location.pathname === path;

  const renderGroup = (label: string, items: typeof mainItems) => (
    <SidebarGroup>
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton asChild isActive={isActive(item.url)}>
                <NavLink
                  to={item.url}
                  end={item.url === '/'}
                  className="hover:bg-sidebar-accent/50"
                  activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                >
                  <item.icon className="mr-2 h-4 w-4" />
                  {!collapsed && <span>{item.title}</span>}
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        {!collapsed && (
          <div className="px-4 pt-5 pb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
                <BookOpen className="w-4 h-4 text-primary-foreground" />
              </div>
              <div>
                <h2 className="text-sm font-bold">Native2Global</h2>
                <p className="text-[10px] text-muted-foreground">
                  {profile?.display_name || 'Learner'}
                </p>
              </div>
            </div>
          </div>
        )}
        {renderGroup('Learn', mainItems)}
        {renderGroup('AI Tools', aiItems)}
        {renderGroup('Track', trackingItems)}
      </SidebarContent>
    </Sidebar>
  );
}
