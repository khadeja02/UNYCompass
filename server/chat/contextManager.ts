// File: /api/src/chat/contextManager.ts (or wherever your chat files are)

export class ConversationContextManager {
    private static contexts = new Map<number, Array<{
        content: string,
        isUser: boolean,
        timestamp: number
    }>>();

    private static readonly MAX_MESSAGES = 4; // Reduced from 8 for speed
    private static readonly EXPIRY_TIME = 30 * 60 * 1000; // 30 minutes

    static addMessage(sessionId: number, content: string, isUser: boolean) {
        if (!this.contexts.has(sessionId)) {
            this.contexts.set(sessionId, []);
        }

        const messages = this.contexts.get(sessionId)!;

        messages.push({
            content: content.length > 150 ? content.substring(0, 150) + "..." : content,
            isUser,
            timestamp: Date.now()
        });

        // Keep only recent messages
        if (messages.length > this.MAX_MESSAGES) {
            messages.shift();
        }

        console.log(`💾 Context updated for session ${sessionId}: ${messages.length} messages`);
    }

    static getContextString(sessionId: number): string {
        const messages = this.contexts.get(sessionId);

        if (!messages || messages.length === 0) {
            return "";
        }

        // Filter out expired messages
        const now = Date.now();
        const validMessages = messages.filter(msg =>
            now - msg.timestamp < this.EXPIRY_TIME
        );

        this.contexts.set(sessionId, validMessages);

        if (validMessages.length === 0) {
            return "";
        }

        return validMessages
            .map(msg => `${msg.isUser ? "User" : "Assistant"}: ${msg.content}`)
            .join("\n") + "\n\n";
    }

    static clearSession(sessionId: number) {
        this.contexts.delete(sessionId);
        console.log(`🗑️ Cleared context for session ${sessionId}`);
    }

    // Debug method to see what's in memory
    static getStats() {
        return {
            totalSessions: this.contexts.size,
            sessions: Array.from(this.contexts.keys()),
            totalMessages: Array.from(this.contexts.values()).reduce((sum, msgs) => sum + msgs.length, 0)
        };
    }
}