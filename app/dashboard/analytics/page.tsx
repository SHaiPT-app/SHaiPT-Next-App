/** The analytics screen moved into the app shell at /progress, where the header and nav are. */
import { redirect } from 'next/navigation';

export default function LegacyAnalyticsRedirect() {
    redirect('/progress');
}
