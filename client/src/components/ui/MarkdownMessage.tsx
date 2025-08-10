// src/components/ui/MarkdownMessage.tsx
import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { cn } from '@/lib/utils';
import { Copy, Check, User, Bot, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import 'highlight.js/styles/github-dark.css';

interface MarkdownMessageProps {
    content: string;
    isUser?: boolean;
    className?: string;
    timestamp?: Date;
    avatar?: string;
    isLoading?: boolean;
}

export const MarkdownMessage: React.FC<MarkdownMessageProps> = ({
    content,
    isUser = false,
    className,
    timestamp,
    avatar,
    isLoading = false
}) => {
    const [copiedCode, setCopiedCode] = React.useState<string | null>(null);
    const [collapsedBlocks, setCollapsedBlocks] = React.useState<Set<string>>(new Set());

    const copyToClipboard = async (text: string, codeId: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedCode(codeId);
            setTimeout(() => setCopiedCode(null), 2000);
        } catch (err) {
            console.error('Failed to copy code:', err);
        }
    };

    const toggleCollapse = (blockId: string) => {
        const newCollapsed = new Set(collapsedBlocks);
        if (newCollapsed.has(blockId)) {
            newCollapsed.delete(blockId);
        } else {
            newCollapsed.add(blockId);
        }
        setCollapsedBlocks(newCollapsed);
    };

    const extractTextContent = (node: React.ReactNode): string => {
        if (typeof node === 'string') return node;
        if (typeof node === 'number') return node.toString();
        if (React.isValidElement(node)) {
            return extractTextContent(node.props.children);
        }
        if (Array.isArray(node)) {
            return node.map(extractTextContent).join('');
        }
        return '';
    };

    const detectLanguage = (className?: string): string => {
        if (!className) return '';
        const match = className.match(/language-(\w+)/);
        return match ? match[1] : '';
    };

    const formatTimestamp = (date: Date): string => {
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const minutes = Math.floor(diff / (1000 * 60));

        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
        return date.toLocaleDateString();
    };

    const components = {
        pre: ({ children, ...props }: React.ComponentProps<'pre'>) => {
            const codeElement = React.Children.toArray(children).find(
                child => React.isValidElement(child) && child.type === 'code'
            ) as React.ReactElement;

            const language = codeElement ? detectLanguage(codeElement.props.className) : '';
            const codeText = extractTextContent(children);
            const codeId = `code-${Math.random().toString(36).slice(2, 11)}`;
            const lineCount = codeText.split('\n').length;
            const isLong = lineCount > 15;
            const isCollapsed = collapsedBlocks.has(codeId);

            return (
                <div className="relative group my-6 rounded-lg overflow-hidden shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 px-4 py-3 border-b border-gray-200 dark:border-gray-600">
                        <div className="flex items-center gap-2">
                            <div className="flex gap-1">
                                <div className="w-3 h-3 rounded-full bg-red-400"></div>
                                <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                                <div className="w-3 h-3 rounded-full bg-green-400"></div>
                            </div>
                            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                                {language ? language.toUpperCase() : 'CODE'}
                            </span>
                            {isLong && (
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                    {lineCount} lines
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            {isLong && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => toggleCollapse(codeId)}
                                    className="h-8 w-8 p-0 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                                    aria-label={isCollapsed ? 'Expand code' : 'Collapse code'}
                                >
                                    {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                </Button>
                            )}
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyToClipboard(codeText, codeId)}
                                className="h-8 w-8 p-0 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                                aria-label="Copy code"
                            >
                                {copiedCode === codeId ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                            </Button>
                        </div>
                    </div>
                    <div className={cn(
                        "transition-all duration-300 ease-in-out overflow-hidden",
                        isCollapsed ? "max-h-32" : "max-h-none"
                    )}>
                        <pre
                            {...props}
                            className="bg-gray-900 dark:bg-gray-950 text-gray-100 p-4 overflow-x-auto border-0 m-0 text-sm leading-6 font-mono"
                        >
                            {children}
                        </pre>
                        {isCollapsed && (
                            <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-gray-900 dark:from-gray-950 to-transparent pointer-events-none" />
                        )}
                    </div>
                </div>
            );
        },

        code: ({ children, className, ...props }: React.ComponentProps<'code'>) => {
            const isInline = !className || !className.includes('language-');

            if (isInline) {
                return (
                    <code
                        className="bg-gray-100 dark:bg-gray-800 text-rose-600 dark:text-rose-400 px-2 py-1 rounded-md text-sm font-mono border border-gray-200 dark:border-gray-700"
                        {...props}
                    >
                        {children}
                    </code>
                );
            }

            return <code className={className} {...props}>{children}</code>;
        },

        h1: (props: React.ComponentProps<'h1'>) => (
            <h1 className="text-3xl font-bold mt-8 mb-4 text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700 pb-2" {...props} />
        ),
        h2: (props: React.ComponentProps<'h2'>) => (
            <h2 className="text-2xl font-semibold mt-6 mb-3 text-gray-900 dark:text-gray-100" {...props} />
        ),
        h3: (props: React.ComponentProps<'h3'>) => (
            <h3 className="text-xl font-medium mt-5 mb-2 text-gray-900 dark:text-gray-100" {...props} />
        ),
        h4: (props: React.ComponentProps<'h4'>) => (
            <h4 className="text-lg font-medium mt-4 mb-2 text-gray-800 dark:text-gray-200" {...props} />
        ),

        ul: (props: React.ComponentProps<'ul'>) => (
            <ul className="my-4 ml-6 list-disc space-y-2 marker:text-purple-500 dark:marker:text-purple-400" {...props} />
        ),
        ol: (props: React.ComponentProps<'ol'>) => (
            <ol className="my-4 ml-6 list-decimal space-y-2 marker:text-purple-500 dark:marker:text-purple-400" {...props} />
        ),

        li: ({ children, className, ...props }: React.ComponentProps<'li'>) => {
            const fullText = extractTextContent(children).trim();
            const match = fullText.match(/^([^:]+:)\s*(.*)$/);
            const headingLike = !!match && fullText.length < 100;

            return (
                <li
                    className={cn(
                        "text-gray-700 dark:text-gray-300 leading-7",
                        headingLike
                            ? "list-none -ml-6 font-semibold text-gray-900 dark:text-gray-100 mt-4 mb-2 first:mt-0"
                            : "pl-2 hover:text-gray-900 dark:hover:text-gray-100 transition-colors",
                        className
                    )}
                    {...props}
                >
                    {headingLike ? (
                        <>
                            <span className="text-purple-600 dark:text-purple-400">{match[1]}</span>
                            {match[2] ? ` ${match[2]}` : null}
                        </>
                    ) : (
                        children
                    )}
                </li>
            );
        },

        'ul ul': (props: React.ComponentProps<'ul'>) => (
            <ul className="ml-6 mt-2 list-[circle] space-y-1 marker:text-gray-400" {...props} />
        ),
        'ol ol': (props: React.ComponentProps<'ol'>) => (
            <ol className="ml-6 mt-2 list-[lower-alpha] space-y-1 marker:text-gray-400" {...props} />
        ),

        blockquote: (props: React.ComponentProps<'blockquote'>) => (
            <blockquote className="border-l-4 border-blue-500 dark:border-blue-400 pl-6 py-3 my-6 bg-blue-50 dark:bg-blue-900/20 rounded-r-lg italic text-gray-700 dark:text-gray-300 shadow-sm" {...props} />
        ),

        table: (props: React.ComponentProps<'table'>) => (
            <div className="overflow-x-auto my-6 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700" {...props} />
            </div>
        ),
        thead: (props: React.ComponentProps<'thead'>) => (
            <thead className="bg-gray-50 dark:bg-gray-800" {...props} />
        ),
        th: (props: React.ComponentProps<'th'>) => (
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider" {...props} />
        ),
        td: (props: React.ComponentProps<'td'>) => (
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700 last:border-b-0" {...props} />
        ),

        a: ({ href, children, ...props }: React.ComponentProps<'a'>) => (
            <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline decoration-2 underline-offset-2 transition-colors font-medium"
                {...props}
            >
                {children}
            </a>
        ),

        p: (props: React.ComponentProps<'p'>) => (
            <p className="mb-4 leading-7 text-gray-700 dark:text-gray-300 last:mb-0" {...props} />
        ),

        hr: (props: React.ComponentProps<'hr'>) => (
            <hr className="my-8 border-0 h-px bg-gradient-to-r from-transparent via-gray-300 dark:via-gray-600 to-transparent" {...props} />
        ),

        input: (props: React.ComponentProps<'input'>) => (
            <input
                type="checkbox"
                className="mr-3 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 transition-colors"
                {...props}
            />
        ),

        strong: (props: React.ComponentProps<'strong'>) => (
            <strong className="font-semibold text-gray-900 dark:text-gray-100" {...props} />
        ),

        em: (props: React.ComponentProps<'em'>) => (
            <em className="italic text-gray-800 dark:text-gray-200" {...props} />
        ),
    };

    if (isUser) {
        return (
            <div className={cn("text-gray-900 dark:text-gray-100 whitespace-pre-wrap break-words", className)}>
                {content}
            </div>
        );
    }

    return (
        <div className={cn("markdown-container max-w-full", className)}>
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeHighlight]}
                components={components}
            >
                {content}
            </ReactMarkdown>
        </div>
    );
};