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
import SetupPage from "./pages/SetupPage";

function PrivateRoute({ component: C }: { component: React.ComponentType }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#E8B84B]" />
    </div>
  );
  if (!user) return <Redirect to="/login" />;
  return <C />;
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
    </Switch>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
      <Toaster position="top-right" richColors />
    </AuthProvider>
  );
}
