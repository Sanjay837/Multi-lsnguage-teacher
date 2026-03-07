import { ReactNode, useState } from 'react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import MobileNav from '@/components/MobileNav';
import { useLanguage } from '@/hooks/useLanguage';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';

export default function AppShell({ children }: { children: ReactNode }) {
  const { activeLanguage, allLanguages, switchLanguage } = useLanguage();
  const [showSwitcher, setShowSwitcher] = useState(false);

  const handleSwitch = async (langId: string) => {
    await switchLanguage(langId);
    setShowSwitcher(false);
    toast.success('Language switched!');
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <div className="hidden md:block">
          <AppSidebar />
        </div>
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-12 items-center border-b border-border px-3 hidden md:flex justify-between">
            <SidebarTrigger />
            <button
              onClick={() => setShowSwitcher(true)}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {activeLanguage ? (
                <>
                  <span>Learning:</span>
                  <span className="font-medium text-foreground">
                    {activeLanguage.flag_emoji} {activeLanguage.name}
                  </span>
                </>
              ) : (
                <span className="text-primary font-medium">Select a language →</span>
              )}
            </button>
          </header>
          <main className="flex-1 pb-20 md:pb-4 max-w-4xl w-full mx-auto">
            {children}
          </main>
        </div>
        <MobileNav />
      </div>

      <Dialog open={showSwitcher} onOpenChange={setShowSwitcher}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Switch Language</DialogTitle>
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
    </SidebarProvider>
  );
}
