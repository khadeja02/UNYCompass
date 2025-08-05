// src/components/ui/MarkdownMessage.tsx
import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { cn } from '@/lib/utils';
import { Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import 'highlight.js/styles/github-dark.css'; // Or choose another theme

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

    // Custom components for markdown rendering
    const components = {
        // Style code blocks with copy button - simplified approach
        pre: (props: React.ComponentProps<'pre'>) => {
            const { children, ...restProps } = props;

            // Extract text content from children for copying
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

            const codeText = extractTextContent(children);
            const codeId = `code-${Math.random().toString(36).substr(2, 9)}`;

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
                            {copiedCode === codeId ? (
                                <Check className="h-4 w-4" />
                            ) : (
                                <Copy className="h-4 w-4" />
                            )}
                        </Button>
                    </div>
                    <pre
                        {...restProps}
                        className="bg-gray-900 text-gray-100 p-4 rounded-b-lg overflow-x-auto border-0 m-0"
                    >
                        {children}
                    </pre>
                </div>
            );
        },

        // Style inline code
        code: (props: React.ComponentProps<'code'>) => {
            const { children, className, ...restProps } = props;

            // Check if this is inline code (no language class usually means inline)
            const isInline = !className || !className.includes('language-');

            if (isInline) {
                return (
                    <code
                        className="bg-gray-100 dark:bg-gray-800 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded text-sm font-mono"
                        {...restProps}
                    >
                        {children}
                    </code>
                );
            }

            // For code blocks, just return the basic code element
            return (
                <code className={className} {...restProps}>
                    {children}
                </code>
            );
        },

        // Style headings
        h1: (props: React.ComponentProps<'h1'>) => (
            <h1 className="text-2xl font-bold mt-6 mb-4 text-gray-900 dark:text-gray-100" {...props}>
                {props.children}
            </h1>
        ),
        h2: (props: React.ComponentProps<'h2'>) => (
            <h2 className="text-xl font-semibold mt-5 mb-3 text-gray-900 dark:text-gray-100" {...props}>
                {props.children}
            </h2>
        ),
        h3: (props: React.ComponentProps<'h3'>) => (
            <h3 className="text-lg font-medium mt-4 mb-2 text-gray-900 dark:text-gray-100" {...props}>
                {props.children}
            </h3>
        ),

        // Style lists
        ul: (props: React.ComponentProps<'ul'>) => (
            <ul className="list-disc list-inside my-3 space-y-1 text-gray-700 dark:text-gray-300" {...props}>
                {props.children}
            </ul>
        ),
        ol: (props: React.ComponentProps<'ol'>) => (
            <ol className="list-decimal list-inside my-3 space-y-1 text-gray-700 dark:text-gray-300" {...props}>
                {props.children}
            </ol>
        ),
        li: (props: React.ComponentProps<'li'>) => (
            <li className="leading-relaxed" {...props}>
                {props.children}
            </li>
        ),

        // Style blockquotes
        blockquote: (props: React.ComponentProps<'blockquote'>) => (
            <blockquote
                className="border-l-4 border-blue-500 pl-4 py-2 my-4 bg-blue-50 dark:bg-blue-900/20 italic text-gray-700 dark:text-gray-300"
                {...props}
            >
                {props.children}
            </blockquote>
        ),

        // Style tables
        table: (props: React.ComponentProps<'table'>) => (
            <div className="overflow-x-auto my-4">
                <table className="min-w-full border-collapse border border-gray-300 dark:border-gray-600" {...props}>
                    {props.children}
                </table>
            </div>
        ),
        th: (props: React.ComponentProps<'th'>) => (
            <th className="border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 px-3 py-2 text-left font-medium" {...props}>
                {props.children}
            </th>
        ),
        td: (props: React.ComponentProps<'td'>) => (
            <td className="border border-gray-300 dark:border-gray-600 px-3 py-2" {...props}>
                {props.children}
            </td>
        ),

        // Style links
        a: (props: React.ComponentProps<'a'>) => (
            <a
                href={props.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:underline"
                {...props}
            >
                {props.children}
            </a>
        ),

        // Style paragraphs
        p: (props: React.ComponentProps<'p'>) => (
            <p className="mb-4 leading-relaxed text-gray-700 dark:text-gray-300 last:mb-0" {...props}>
                {props.children}
            </p>
        ),
    };

    if (isUser) {
        // For user messages, keep simple formatting
        return (
            <div className={cn("text-gray-900 dark:text-gray-100", className)}>
                {content}
            </div>
        );
    }

    // For AI messages, use full markdown rendering
    return (
        <div className={cn("prose prose-sm max-w-none dark:prose-invert", className)}>
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