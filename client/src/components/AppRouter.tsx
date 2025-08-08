import { Switch, Route, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import AuthPage from "@/components/auth/AuthPage";
import ChatPage from "@/pages/chat";
import NotFound from "@/pages/not-found";
import ResetPasswordForm from "@/components/auth/ResetPasswordForm";

const AppRouter = () => {
    const { user, isLoading } = useAuth();
    const [location] = useLocation();

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div>Loading...</div>
            </div>
        );
    }

    // Allow access to reset password page even when not logged in
    if (location.startsWith('/reset-password')) {
        return (
            <Switch>
                <Route path="/reset-password" component={ResetPasswordForm} />
                <Route component={NotFound} />
            </Switch>
        );
    }

    // If not logged in and not on reset password page, show auth page
    if (!user) {
        return <AuthPage />;
    }

    // Logged in user routes
    return (
        <Switch>
            <Route path="/" component={ChatPage} />
            <Route path="/chat" component={ChatPage} />
            <Route component={NotFound} />
        </Switch>
    );
};

export default AppRouter;