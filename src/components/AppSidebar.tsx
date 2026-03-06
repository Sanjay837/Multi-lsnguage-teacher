import { useState } from 'react';
import {
  Home, BookOpen, MessageCircle, GraduationCap, BarChart3, User,
  Layers, Mic, Theater, Trophy, Settings, Plus, Check, Globe, X,
} from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useLocation } from 'react-router-dom';
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';

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
  const { activeLanguage, userLanguages, allLanguages, setActiveLanguage, addLanguage, removeLanguage } = useLanguage();
  const [showAddModal, setShowAddModal] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  const availableToAdd = allLanguages.filter(l => !userLanguages.some(ul => ul.id === l.id));

  const handleAddLanguage = async (langId: string) => {
    await addLanguage(langId);
    toast.success('Language added!');
  };

  const handleSetActive = async (langId: string) => {
    await setActiveLanguage(langId);
  };

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
    <>
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

          {/* Language Selector */}
          <SidebarGroup>
            <SidebarGroupLabel>
              <Globe className="w-3.5 h-3.5 mr-1 inline" />
              Languages
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <div className="px-2 space-y-1">
                {userLanguages.map((lang) => (
                  <button
                    key={lang.id}
                    onClick={() => handleSetActive(lang.id)}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-all ${
                      activeLanguage?.id === lang.id
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
                    }`}
                  >
                    <span className="text-base">{lang.flag_emoji}</span>
                    {!collapsed && (
                      <>
                        <span className="flex-1 text-left truncate">{lang.name}</span>
                        {activeLanguage?.id === lang.id && (
                          <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                        )}
                      </>
                    )}
                  </button>
                ))}
                {!collapsed && (
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Language</span>
                  </button>
                )}
                {collapsed && (
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="w-full flex items-center justify-center p-1.5 rounded-lg text-muted-foreground hover:bg-sidebar-accent/50"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                )}
              </div>
            </SidebarGroupContent>
          </SidebarGroup>

          {renderGroup('Learn', mainItems)}
          {renderGroup('AI Tools', aiItems)}
          {renderGroup('Track', trackingItems)}
        </SidebarContent>
      </Sidebar>

      {/* Add Language Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add a Language</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="grid grid-cols-2 gap-2 pr-2">
              {availableToAdd.map((lang) => (
                <button
                  key={lang.id}
                  onClick={() => { handleAddLanguage(lang.id); setShowAddModal(false); }}
                  className="flex items-center gap-2 p-3 rounded-xl border border-border hover:border-primary/40 hover:bg-primary/5 transition-all text-left"
                >
                  <span className="text-xl">{lang.flag_emoji}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{lang.name}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{lang.native_name}</p>
                  </div>
                </button>
              ))}
              {availableToAdd.length === 0 && (
                <p className="col-span-2 text-sm text-muted-foreground text-center py-4">All languages added!</p>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}
