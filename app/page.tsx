import LandingPage from '@/components/landing/LandingPage';
import StructuredData from '@/components/landing/StructuredData';

/**
 * The landing route.
 *
 * This is a server component so it can emit JSON-LD into the initial HTML; the page itself — the
 * title sequence, the pinned phone reveal, the signed-in redirect — is a client component and is
 * unchanged. Splitting them is what lets a crawler read structured data without the page having to
 * hydrate first.
 */
export default function Home() {
    return (
        <>
            <StructuredData />
            <LandingPage />
        </>
    );
}
