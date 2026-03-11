import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Orders from "./pages/Orders";
import Stats from "./pages/Stats";
import AiPlanner from "./pages/AiPlanner";
import ImportExport from "./pages/ImportExport";
import Settings from "./pages/Settings";
import AdminPanel from "./pages/AdminPanel";
import Welcome from "./pages/Welcome";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Tavern from "./pages/Tavern";
import CharacterSetup from "./pages/CharacterSetup";
import Character from "./pages/Character";
import DailyQuest from "./pages/DailyQuest";
import Plaza from "./pages/Plaza";
import MyCalendar from "./pages/MyCalendar";
import TodoQuadrant from "./pages/TodoQuadrant";
import Inventory from "./pages/Inventory";
import AssistantDashboard from "./pages/AssistantDashboard";

function Router() {
  return (
    <Switch>
      {/* Public magic world pages */}
      <Route path="/welcome" component={Welcome} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />

      {/* RPG system pages */}
      <Route path="/tavern" component={Tavern} />
      <Route path="/character-setup" component={CharacterSetup} />
      <Route path="/character" component={Character} />
      <Route path="/daily-quest" component={DailyQuest} />
      <Route path="/plaza" component={Plaza} />

      {/* New feature pages */}
      <Route path="/calendar" component={MyCalendar} />
      <Route path="/todo-quadrant" component={TodoQuadrant} />
      <Route path="/inventory" component={Inventory} />
      <Route path="/assistant" component={AssistantDashboard} />

      {/* Dashboard pages (owner / admin / assistant) */}
      <Route path="/" component={Home} />
      <Route path="/orders" component={Orders} />
      <Route path="/stats" component={Stats} />
      <Route path="/ai" component={AiPlanner} />
      <Route path="/import-export" component={ImportExport} />
      <Route path="/settings" component={Settings} />
      <Route path="/admin" component={AdminPanel} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster richColors position="top-right" />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
