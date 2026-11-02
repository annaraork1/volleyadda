export default function PrivacyPage() {
  return (
    <div className="card stack" style={{ maxWidth: 720, margin: "24px auto" }}>
      <h1>VolleyAdda privacy</h1>
      <p>
        VolleyAdda is a volleyball scoring and tournament app. When you create an account we store your name, email,
        and sign-in details. When you run a tournament we store team names, player names you enter, match scores, and
        optional photos you upload.
      </p>
      <p>
        Spectators who open a share link can see public tournament information (names, scores, photos you publish).
        Private registration fields such as phone numbers are not shown on public pages.
      </p>
      <p>
        You can delete your account from the app or website. Deleting your account removes your login. Matches and
        tournaments you shared with other organisers stay available to them.
      </p>
      <p>
        Contact support from Report a problem in the app, or email the address listed for your VolleyAdda deployment.
      </p>
    </div>
  );
}
