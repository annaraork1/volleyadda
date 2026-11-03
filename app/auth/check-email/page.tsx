import Link from "next/link";

export default function CheckEmailPage() {
  return (
    <div className="auth-page">
      <div className="card auth-card">
        <h1>Check your email</h1>
        <p>We sent a verification link. Open it to create matches and tournaments.</p>
        <p className="auth-links">
          <Link href="/">Back to home</Link>
        </p>
      </div>
    </div>
  );
}
