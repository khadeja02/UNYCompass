import { Switch, Route } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import AuthPage from "@/components/auth/AuthPage";
import ChatPage from "@/pages/chat";
import NotFound from "@/pages/not-found";


const AppRouter = () => {
    const { user, isLoading } = useAuth();

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div>Loading...</div>
            </div>
        );
    }

    if (!user) {
        return <AuthPage />;
    }

    return (
        <Switch>
            <Route path="/" component={ChatPage} />
            <Route path="/chat" component={ChatPage} />
            <Route component={NotFound} />
        </Switch>
    );
};

export default AppRouter;