import Link from "next/link";

export default function CheckEmailPage() {
  return (
    <div className="card stack" style={{ maxWidth: 480, margin: "40px auto" }}>
      <h1>Check your email</h1>
      <p>We sent a verification link. Open it to create matches and tournaments.</p>
      <p>
        <Link href="/">Back to home</Link>
      </p>
    </div>
  );
}
