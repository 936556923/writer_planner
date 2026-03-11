import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { getLoginUrl } from "@/const";
import { useIsMobile } from "@/hooks/useMobile";
import {
  BarChart3,
  Bot,
  FileUp,
  LayoutDashboard,
  LogOut,
  PanelLeft,
  Settings,
  ShieldCheck,
  ClipboardList,
  Sparkles,
  Sword,
  User,
  CalendarDays,
  Target,
  Backpack,
  Handshake,
} from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { trpc } from "@/lib/trpc";

const ROLE_LABELS: Record<string, string> = {
  admin: "管理员",
  owner: "管理员", // backward compat
  assistant: "助理",
  user: "普通用户",
  resident: "普通用户", // backward compat
};

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-blue-100 text-blue-700",
  owner: "bg-blue-100 text-blue-700", // backward compat
  assistant: "bg-purple-100 text-purple-700",
  user: "bg-gray-100 text-gray-600",
  resident: "bg-gray-100 text-gray-600", // backward compat
};

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const DEFAULT_WIDTH = 240;
const MIN_WIDTH = 200;
const MAX_WIDTH = 320;

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { loading, user } = useAuth();

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  if (loading) return <DashboardLayoutSkeleton />;

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="flex flex-col items-center gap-8 p-10 max-w-md w-full bg-white rounded-2xl shadow-lg border border-slate-100">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <ClipboardList className="w-8 h-8 text-primary" />
          </div>
          <div className="flex flex-col items-center gap-3 text-center">
            <h1 className="text-2xl font-bold tracking-tight">写手工作规划助手</h1>
            <p className="text-sm text-muted-foreground max-w-xs">
              登录后即可管理您的写作订单、查看收入统计、使用 AI 智能规划
            </p>
          </div>
          <Button
            onClick={() => { window.location.href = "/login"; }}
            size="lg"
            className="w-full"
          >
            登录 / 注册
          </Button>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider style={{ "--sidebar-width": `${sidebarWidth}px` } as CSSProperties}>
      <DashboardLayoutContent setSidebarWidth={setSidebarWidth}>
        {children}
      </DashboardLayoutContent>
    </SidebarProvider>
  );
}

function DashboardLayoutContent({
  children,
  setSidebarWidth,
}: {
  children: React.ReactNode;
  setSidebarWidth: (w: number) => void;
}) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  // Get authorized admins for assistants
  const { data: authorizedAdmins } = trpc.settings.getAuthorizedAdmins.useQuery(undefined, {
    enabled: user?.role === "assistant",
  });

  const isWorkUser = user?.role === "admin" || user?.role === "owner" || user?.role === "assistant";

  // Work tools: only visible to admin and assistant
  const workMenuItems = isWorkUser ? [
    { icon: ClipboardList, label: "订单管理", path: "/orders" },
    { icon: BarChart3, label: "收入统计", path: "/stats" },
    { icon: Bot, label: "AI 规划", path: "/ai" },
    { icon: FileUp, label: "导入 / 导出", path: "/import-export" },
    { icon: Settings, label: "设置", path: "/settings" },
  ] : [];

  // Admin-only
  const adminMenuItems = (user?.role === "admin" || user?.role === "owner") ? [
    { icon: ShieldCheck, label: "管理后台", path: "/admin" },
  ] : [];

  // New feature menus: visible to all work users
  const newFeatureItems = isWorkUser ? [
    { icon: CalendarDays, label: "日历行程", path: "/calendar" },
    { icon: Target, label: "四象限任务", path: "/todo-quadrant" },
    { icon: Backpack, label: "我的背包", path: "/inventory" },
  ] : [];

  // Assistant-specific menu
  const assistantMenuItems = user?.role === "assistant" ? [
    { icon: Handshake, label: "协作中心", path: "/assistant" },
  ] : [];

  // Game menus: visible to all users
  const gameMenuItems = [
    { icon: Sparkles, label: "魔法酒馆", path: "/tavern" },
    { icon: Sword, label: "每日剧情", path: "/daily-quest" },
    { icon: User, label: "我的角色", path: "/character" },
  ];

  const menuItems = [
    { icon: LayoutDashboard, label: "仪表盘", path: "/" },
    ...workMenuItems,
    ...newFeatureItems,
    ...assistantMenuItems,
    ...adminMenuItems,
    ...gameMenuItems,
  ];

  useEffect(() => {
    if (isCollapsed) setIsResizing(false);
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = e.clientX - sidebarLeft;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) setSidebarWidth(newWidth);
    };
    const handleMouseUp = () => setIsResizing(false);
    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  const activeItem = menuItems.find((m) => m.path === location);

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar collapsible="icon" className="border-r-0" disableTransition={isResizing}>
          <SidebarHeader className="h-14 justify-center border-b border-sidebar-border">
            <div className="flex items-center gap-2.5 px-2">
              <button
                onClick={toggleSidebar}
                className="h-8 w-8 flex items-center justify-center hover:bg-sidebar-accent rounded-lg transition-colors shrink-0"
                aria-label="Toggle sidebar"
              >
                <PanelLeft className="h-4 w-4 text-sidebar-foreground/60" />
              </button>
              {!isCollapsed && (
                <span className="font-bold text-sidebar-foreground tracking-tight truncate text-sm">
                  写手规划助手
                </span>
              )}
            </div>
          </SidebarHeader>

          <SidebarContent className="gap-0 pt-2">
            <SidebarMenu className="px-2">
              {menuItems.map((item) => {
                const isActive = location === item.path;
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      isActive={isActive}
                      onClick={() => setLocation(item.path)}
                      tooltip={item.label}
                      className="h-9 font-normal text-sidebar-foreground/80 hover:text-sidebar-foreground"
                    >
                      <item.icon className={`h-4 w-4 ${isActive ? "text-sidebar-primary" : ""}`} />
                      <span className="text-sm">{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>

            {/* Assistant: show authorized admins */}
            {!isCollapsed && user?.role === "assistant" && authorizedAdmins && authorizedAdmins.length > 0 && (
              <div className="px-3 pt-4">
                <p className="text-xs text-sidebar-foreground/40 mb-2 uppercase tracking-wider">已授权管理员</p>
                {authorizedAdmins.map((a) => (
                  <div key={a.adminId} className="text-xs text-sidebar-foreground/70 py-1 truncate">
                    {a.adminName || a.adminEmail || `用户 #${a.adminId}`}
                  </div>
                ))}
              </div>
            )}
          </SidebarContent>

          <SidebarFooter className="p-2 border-t border-sidebar-border">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2.5 rounded-lg px-2 py-2 hover:bg-sidebar-accent transition-colors w-full text-left focus:outline-none">
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarFallback className="text-xs font-semibold bg-sidebar-primary text-sidebar-primary-foreground">
                      {user?.name?.charAt(0).toUpperCase() ?? "U"}
                    </AvatarFallback>
                  </Avatar>
                  {!isCollapsed && (
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-sidebar-foreground truncate">{user?.name || "用户"}</p>
                      <p className="text-xs text-sidebar-foreground/50 truncate">{user?.email || ""}</p>
                    </div>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <div className="px-3 py-2">
                  <p className="text-sm font-medium">{user?.name || "用户"}</p>
                  <p className="text-xs text-muted-foreground">{user?.email || ""}</p>
                  <span className={`inline-block mt-1.5 text-xs px-2 py-0.5 rounded-full ${ROLE_COLORS[user?.role ?? "user"] ?? ""}`}>
                    {ROLE_LABELS[user?.role ?? "user"] ?? user?.role}
                  </span>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setLocation("/settings")} className="cursor-pointer">
                  <Settings className="mr-2 h-4 w-4" />
                  设置
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={async () => { await logout(); setLocation("/login"); }} className="cursor-pointer text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  退出登录
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>

        <div
          className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/20 transition-colors ${isCollapsed ? "hidden" : ""}`}
          onMouseDown={() => { if (!isCollapsed) setIsResizing(true); }}
          style={{ zIndex: 50 }}
        />
      </div>

      <SidebarInset>
        {isMobile && (
          <div className="flex border-b h-14 items-center px-4 bg-background/95 backdrop-blur sticky top-0 z-40">
            <SidebarTrigger className="h-9 w-9 rounded-lg mr-3" />
            <span className="font-medium text-sm">{activeItem?.label ?? "写手规划助手"}</span>
          </div>
        )}
        <main className="flex-1 min-h-screen">{children}</main>
      </SidebarInset>
    </>
  );
}
