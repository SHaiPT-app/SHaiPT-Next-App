import type { Metadata } from 'next';
import DemoChrome from '@/components/demo/DemoChrome';

/**
 * The demo walkthrough is six pages that reproduce product screens with canned data. They are
 * genuinely useful to a visitor and genuinely worthless to a search engine: thin, near-duplicates
 * of each other and of the real app, and they would compete with the landing page for the same
 * terms while adding nothing a searcher wants to land on.
 *
 * noindex rather than a robots.txt disallow: a crawler has to be allowed to fetch a page to read
 * the directive, and `follow` keeps the internal links flowing back to /.
 */
export const metadata: Metadata = {
    robots: { index: false, follow: true },
};

export default function DemoLayout({ children }: { children: React.ReactNode }) {
    return <DemoChrome>{children}</DemoChrome>;
}
