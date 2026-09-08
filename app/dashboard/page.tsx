/**
 * The pre-overhaul dashboard. /home replaced it: same plans and workouts, inside the app shell
 * with the header and nav. Kept as a redirect so an old bookmark or link still lands somewhere.
 */
import { redirect } from 'next/navigation';

export default function LegacyDashboardRedirect() {
    redirect('/home');
}
