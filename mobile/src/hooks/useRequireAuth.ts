import { useRouter } from "expo-router";
import { useAuth } from "../context/AuthContext";

/** Navigate to href, or to sign-in with next= if the user is logged out. */
export function useRequireAuth() {
  const { isSignedIn } = useAuth();
  const router = useRouter();
  return (href: string) => {
    if (isSignedIn) router.push(href as never);
    else router.push({ pathname: "/auth/login", params: { next: href } });
  };
}
