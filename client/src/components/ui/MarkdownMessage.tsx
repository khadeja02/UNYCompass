// src/components/ui/MarkdownMessage.tsx
import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { cn } from '@/lib/utils';
import { Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import 'highlight.js/styles/github-dark.css';

interface MarkdownMessageProps {
    content: string;
    isUser?: boolean;
    className?: string;
}

export const MarkdownMessage: React.FC<MarkdownMessageProps> = ({
    content,
    isUser = false,
    className
}) => {
    const [copiedCode, setCopiedCode] = React.useState<string | null>(null);

    const copyToClipboard = async (text: string, codeId: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedCode(codeId);
            setTimeout(() => setCopiedCode(null), 2000);
        } catch (err) {
            console.error('Failed to copy code:', err);
        }
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

    const components = {
        pre: ({ children, ...props }: React.ComponentProps<'pre'>) => {
            const codeText = extractTextContent(children);
            const codeId = `code-${Math.random().toString(36).slice(2, 11)}`;

            return (
                <div className="relative group my-4">
                    <div className="flex items-center justify-between bg-gray-800 px-4 py-2 rounded-t-lg">
                        <span className="text-sm text-gray-300 font-mono">Code</span>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(codeText, codeId)}
                            className="h-8 w-8 p-0 text-gray-400 hover:text-white"
                        >
                            {copiedCode === codeId ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        </Button>
                    </div>
                    <pre
                        {...props}
                        className="bg-gray-900 text-gray-100 p-4 rounded-b-lg overflow-x-auto border-0 m-0"
                    >
                        {children}
                    </pre>
                </div>
            );
        },

        code: ({ children, className, ...props }: React.ComponentProps<'code'>) => {
            const isInline = !className || !className.includes('language-');

            if (isInline) {
                return (
                    <code
                        className="bg-gray-100 dark:bg-gray-800 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded text-sm font-mono"
                        {...props}
                    >
                        {children}
                    </code>
                );
            }

            return <code className={className} {...props}>{children}</code>;
        },

        h1: (props: React.ComponentProps<'h1'>) => (
            <h1 className="text-2xl font-bold mt-6 mb-4 text-gray-900 dark:text-gray-100" {...props} />
        ),
        h2: (props: React.ComponentProps<'h2'>) => (
            <h2 className="text-xl font-semibold mt-5 mb-3 text-gray-900 dark:text-gray-100" {...props} />
        ),
        h3: (props: React.ComponentProps<'h3'>) => (
            <h3 className="text-lg font-medium mt-4 mb-2 text-gray-900 dark:text-gray-100" {...props} />
        ),

        ul: (props: React.ComponentProps<'ul'>) => (
            <ul className="my-3 ml-6 list-disc space-y-1.5" {...props} />
        ),
        ol: (props: React.ComponentProps<'ol'>) => (
            <ol className="my-3 ml-6 list-decimal space-y-1.5" {...props} />
        ),

        li: ({ children, className, ...props }: React.ComponentProps<'li'>) => {
            const fullText = extractTextContent(children).trim();
            const match = fullText.match(/^([^:]+:)\s*(.*)$/);
            const headingLike = !!match;

            return (
                <li
                    className={cn(
                        "text-gray-700 dark:text-gray-300 leading-relaxed",
                        headingLike
                            ? "list-none -ml-6 font-medium"
                            : "pl-1 marker:text-gray-500 dark:marker:text-gray-400",
                        className
                    )}
                    {...props}
                >
                    {headingLike ? (
                        <>
                            <span className="font-medium">{match[1]}</span>
                            {match[2] ? ` ${match[2]}` : null}
                        </>
                    ) : (
                        children
                    )}
                </li>
            );
        },

        'ul ul': (props: React.ComponentProps<'ul'>) => (
            <ul className="ml-4 mt-1 list-[circle] space-y-1" {...props} />
        ),
        'ol ol': (props: React.ComponentProps<'ol'>) => (
            <ol className="ml-4 mt-1 list-[lower-latin] space-y-1" {...props} />
        ),
        'ul ol': (props: React.ComponentProps<'ol'>) => (
            <ol className="ml-4 mt-1 list-[lower-latin] space-y-1" {...props} />
        ),
        'ol ul': (props: React.ComponentProps<'ul'>) => (
            <ul className="ml-4 mt-1 list-[circle] space-y-1" {...props} />
        ),

        blockquote: (props: React.ComponentProps<'blockquote'>) => (
            <blockquote className="border-l-4 border-blue-500 pl-4 py-2 my-4 bg-blue-50 dark:bg-blue-900/20 italic text-gray-700 dark:text-gray-300" {...props} />
        ),

        table: (props: React.ComponentProps<'table'>) => (
            <div className="overflow-x-auto my-4">
                <table className="min-w-full border-collapse border border-gray-300 dark:border-gray-600" {...props} />
            </div>
        ),
        th: (props: React.ComponentProps<'th'>) => (
            <th className="border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 px-3 py-2 text-left font-medium" {...props} />
        ),
        td: (props: React.ComponentProps<'td'>) => (
            <td className="border border-gray-300 dark:border-gray-600 px-3 py-2" {...props} />
        ),

        a: (props: React.ComponentProps<'a'>) => (
            <a href={props.href} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline" {...props} />
        ),

        p: (props: React.ComponentProps<'p'>) => (
            <p className="mb-3 leading-relaxed text-gray-700 dark:text-gray-300 last:mb-0" {...props} />
        ),

        input: (props: React.ComponentProps<'input'>) => (
            <input
                type="checkbox"
                className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800"
                {...props}
            />
        ),
    };

    if (isUser) {
        return (
            <div className={cn("text-gray-900 dark:text-gray-100 whitespace-pre-wrap", className)}>
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
