import { useState } from 'react';
import {
  Home, BookOpen, MessageCircle, GraduationCap, BarChart3, User,
  Layers, Mic, Theater, Trophy, Settings, Globe, Trash2, RefreshCw,
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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from '@/components/ui/context-menu';
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
  const { activeLanguage, allLanguages, switchLanguage, removeActiveLanguage } = useLanguage();
  const [showSwitchModal, setShowSwitchModal] = useState(false);
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  const handleSwitch = async (langId: string) => {
    await switchLanguage(langId);
    setShowSwitchModal(false);
    toast.success('Language switched!');
  };

  const handleRemove = async () => {
    await removeActiveLanguage();
    setShowRemoveDialog(false);
    toast.success('Language removed');
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
                  <h2 className="text-sm font-bold">Polyverse AI</h2>
                  <p className="text-[10px] text-muted-foreground">
                    {profile?.display_name || 'Learner'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Single Active Language */}
          <SidebarGroup>
            <SidebarGroupLabel>
              <Globe className="w-3.5 h-3.5 mr-1 inline" />
              Language
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <div className="px-2 space-y-1">
                {activeLanguage ? (
                  <ContextMenu>
                    <ContextMenuTrigger asChild>
                      <button
                        className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-sm bg-primary/10 text-primary font-medium cursor-context-menu"
                      >
                        <span className="text-lg">{activeLanguage.flag_emoji}</span>
                        {!collapsed && (
                          <>
                            <span className="flex-1 text-left truncate">{activeLanguage.name}</span>
                            <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full">Active</span>
                          </>
                        )}
                      </button>
                    </ContextMenuTrigger>
                    <ContextMenuContent>
                      <ContextMenuItem onClick={() => setShowSwitchModal(true)}>
                        <RefreshCw className="w-3.5 h-3.5 mr-2" />
                        Switch Language
                      </ContextMenuItem>
                      <ContextMenuItem onClick={() => setShowRemoveDialog(true)} className="text-destructive focus:text-destructive">
                        <Trash2 className="w-3.5 h-3.5 mr-2" />
                        Remove Language
                      </ContextMenuItem>
                    </ContextMenuContent>
                  </ContextMenu>
                ) : (
                  <button
                    onClick={() => setShowSwitchModal(true)}
                    className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-sm text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground transition-all border border-dashed border-border"
                  >
                    <Globe className="w-4 h-4" />
                    {!collapsed && <span>Select a Language</span>}
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

      {/* Switch Language Modal */}
      <Dialog open={showSwitchModal} onOpenChange={setShowSwitchModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Choose a Language</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="grid grid-cols-2 gap-2 pr-2">
              {allLanguages.map((lang) => (
                <button
                  key={lang.id}
                  onClick={() => handleSwitch(lang.id)}
                  className={`flex items-center gap-2 p-3 rounded-xl border transition-all text-left ${
                    activeLanguage?.id === lang.id
                      ? 'border-primary bg-primary/10 ring-1 ring-primary/30'
                      : 'border-border hover:border-primary/40 hover:bg-primary/5'
                  }`}
                >
                  <span className="text-xl">{lang.flag_emoji}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{lang.name}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{lang.native_name}</p>
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Remove Confirmation */}
      <AlertDialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this learning language?</AlertDialogTitle>
            <AlertDialogDescription>
              This will clear your active language. You can always select a new one.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemove}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
