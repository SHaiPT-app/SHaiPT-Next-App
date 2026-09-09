import { FAQ_ITEMS } from '@/lib/landing/faq';
import { PRICING_TIERS } from '@/lib/landing/pricing';
import { SITE_URL, SITE_NAME, absoluteUrl } from '@/lib/seo';

/**
 * JSON-LD for the landing page.
 *
 * Three blocks, one <script> each, all built from the arrays the page actually renders so the
 * markup cannot drift from the visible content. There is deliberately no WebSite/SearchAction:
 * that is only honest when a site has a real search endpoint, and this one does not.
 *
 * `sameAs` lists only profiles that actually exist. It is how Google ties this site to the same
 * entity elsewhere, which is most of the work of telling SHaiPT apart from shaip.com — so add real
 * profiles here as they appear, and never invent one.
 */
export default function StructuredData() {
    const softwareApplication = {
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        '@id': `${SITE_URL}/#app`,
        name: SITE_NAME,
        alternateName: 'SHaiPT AI Personal Trainer',
        applicationCategory: 'HealthApplication',
        applicationSubCategory: 'Fitness',
        operatingSystem: 'Web, iOS, Android',
        url: `${SITE_URL}/`,
        description:
            'An AI personal trainer that scores lifting technique from one phone camera. Every rep is tracked, replayed in 3D and checked against written per-exercise rules — no wearable, no fixed camera rig.',
        featureList: [
            'Real-time rep counting from the phone camera',
            '3D replay of every set',
            'Per-rep technique score with named joint angles',
            'AR placement of the replay via AR Quick Look on iPhone',
            'AI-generated workout plans and nutrition coaching',
        ],
        publisher: { '@id': `${SITE_URL}/#organization` },
        offers: PRICING_TIERS.map((tier) => ({
            '@type': 'Offer',
            name: tier.name,
            description: tier.description,
            price: tier.price.replace('$', ''),
            priceCurrency: 'USD',
            category: 'subscription',
            url: `${SITE_URL}/#pricing`,
            availability: 'https://schema.org/InStock',
        })),
    };

    const organization = {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        '@id': `${SITE_URL}/#organization`,
        name: SITE_NAME,
        url: `${SITE_URL}/`,
        logo: {
            '@type': 'ImageObject',
            url: absoluteUrl('/logo_transparent.png'),
            width: 512,
            height: 512,
        },
        description:
            'SHaiPT builds an AI personal trainer that measures and scores lifting technique from an ordinary phone camera.',
        sameAs: ['https://www.instagram.com/shaiptofficial'],
    };

    const faqPage = {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        '@id': `${SITE_URL}/#faq`,
        mainEntity: FAQ_ITEMS.map((item) => ({
            '@type': 'Question',
            name: item.q,
            acceptedAnswer: { '@type': 'Answer', text: item.a },
        })),
    };

    return (
        <>
            {[softwareApplication, organization, faqPage].map((block) => (
                <script
                    key={block['@id']}
                    type="application/ld+json"
                    // Schema objects are built from local constants, never from user input.
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(block) }}
                />
            ))}
        </>
    );
}
