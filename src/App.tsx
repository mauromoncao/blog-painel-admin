import React from "react";
import { Switch, Route, Redirect } from "wouter";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { Toaster } from "sonner";
import LoginPage from "./pages/LoginPage";
import AdminLayout from "./pages/AdminLayout";
import Dashboard from "./pages/Dashboard";
import BlogPosts from "./pages/BlogPosts";
import PostEditor from "./pages/PostEditor";
import Categories from "./pages/Categories";
import MediaLibrary from "./pages/MediaLibrary";
import FaqAdmin from "./pages/FaqAdmin";
import LeadsAdmin from "./pages/LeadsAdmin";
import Settings from "./pages/Settings";
import EnvVariables from "./pages/EnvVariables";
import SetupPage from "./pages/SetupPage";

// ── ErrorBoundary ──────────────────────────────────────────────
class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  { hasError: boolean; error: string }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: "" };
  }
  static getDerivedStateFromError(err: any) {
    return { hasError: true, error: String(err?.message ?? err) };
  }
  componentDidCatch(err: any, info: any) {
    console.error("[ErrorBoundary]", err, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-8 text-center">
          <div className="text-5xl">⚠️</div>
          <h2 className="text-xl font-bold text-gray-800">Erro ao carregar esta página</h2>
          <p className="text-gray-500 text-sm max-w-md">{this.state.error}</p>
          <button
            onClick={() => { this.setState({ hasError: false, error: "" }); window.location.reload(); }}
            className="px-5 py-2.5 rounded-xl text-white text-sm font-semibold shadow"
            style={{ background: "linear-gradient(135deg, #E8B84B, #d4a039)" }}
          >
            Tentar novamente
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── PrivateRoute ───────────────────────────────────────────────
function PrivateRoute({ component: C }: { component: React.ComponentType }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#E8B84B]" />
    </div>
  );
  if (!user) return <Redirect to="/login" />;
  return (
    <ErrorBoundary>
      <C />
    </ErrorBoundary>
  );
}

function AppRoutes() {
  return (
    <Switch>
      <Route path="/login" component={LoginPage} />
      <Route path="/setup" component={SetupPage} />
      <Route path="/" component={() => <Redirect to="/dashboard" />} />
      <Route path="/dashboard" component={() => (
        <AdminLayout>
          <PrivateRoute component={Dashboard} />
        </AdminLayout>
      )} />
      <Route path="/blog" component={() => (
        <AdminLayout>
          <PrivateRoute component={BlogPosts} />
        </AdminLayout>
      )} />
      <Route path="/blog/new" component={() => (
        <AdminLayout>
          <PrivateRoute component={PostEditor} />
        </AdminLayout>
      )} />
      <Route path="/blog/:id/edit" component={() => (
        <AdminLayout>
          <PrivateRoute component={PostEditor} />
        </AdminLayout>
      )} />
      <Route path="/categories" component={() => (
        <AdminLayout>
          <PrivateRoute component={Categories} />
        </AdminLayout>
      )} />
      <Route path="/media" component={() => (
        <AdminLayout>
          <PrivateRoute component={MediaLibrary} />
        </AdminLayout>
      )} />
      <Route path="/faq" component={() => (
        <AdminLayout>
          <PrivateRoute component={FaqAdmin} />
        </AdminLayout>
      )} />
      <Route path="/leads" component={() => (
        <AdminLayout>
          <PrivateRoute component={LeadsAdmin} />
        </AdminLayout>
      )} />
      <Route path="/settings" component={() => (
        <AdminLayout>
          <PrivateRoute component={Settings} />
        </AdminLayout>
      )} />
      <Route path="/env" component={() => (
        <AdminLayout>
          <PrivateRoute component={EnvVariables} />
        </AdminLayout>
      )} />
    </Switch>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ErrorBoundary>
        <AppRoutes />
      </ErrorBoundary>
      <Toaster position="top-right" richColors />
    </AuthProvider>
  );
}
