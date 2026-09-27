import { Redirect } from 'expo-router';

// A stale bookmark or shared link from before a URL-structure change (e.g. the
// pre-/app/ deep links) has no matching route. Redirect home instead of
// leaving the visitor on expo-router's generic "Unmatched Route" screen.
export default function NotFoundScreen() {
  return <Redirect href="/" />;
}
