// client/src/components/ui/ChatHeader.tsx
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { User, Settings, HelpCircle, LogOut, Moon, Sun, Bot } from "lucide-react";

interface ChatHeaderProps {
    theme: string;
    toggleTheme: () => void;
    user: {
        username?: string;
        email?: string;
    } | null;
    logout: () => void;
}

export function ChatHeader({ theme, toggleTheme, user, logout }: ChatHeaderProps) {
    return (
        <div className="bg-background shadow-sm px-6 py-4 flex justify-between items-center border-b border-border">
            <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={toggleTheme} className="h-8 w-8">
                    {theme === "light" ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                </Button>

                <Badge variant="outline" className="ml-2">
                    <Bot className="w-3 h-3 mr-1" />
                    Hunter AI Advisor
                </Badge>
            </div>

            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="flex items-center gap-2 p-2">
                        <Avatar className="w-10 h-10">
                            <AvatarImage src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=40&h=40" />
                            <AvatarFallback>{user?.username?.slice(0, 2).toUpperCase() || "UN"}</AvatarFallback>
                        </Avatar>
                        <div className="text-left">
                            <div className="text-sm font-medium">{user?.username || "User"}</div>
                            <div className="text-xs text-gray-500">{user?.email || "user@example.com"}</div>
                        </div>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={() => alert("Profile functionality coming soon!")}>
                        <User className="w-4 h-4 mr-2" />
                        My Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => alert("Settings functionality coming soon!")}>
                        <Settings className="w-4 h-4 mr-2" />
                        Settings
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => alert("Help functionality coming soon!")}>
                        <HelpCircle className="w-4 h-4 mr-2" />
                        Help
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-red-600" onClick={logout}>
                        <LogOut className="w-4 h-4 mr-2" />
                        Log Out
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
}