import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    async signIn() {
      // Allow all sign-ins — distributor authorization is checked when we
      // exchange the Google token for a BPI JWT. BPI rejects non-whitelisted emails.
      return true;
    },
    async jwt({ token, account }) {
      // Persist the Google id_token so we can exchange it with BPI
      if (account?.id_token) {
        token.googleIdToken = account.id_token;
      }
      return token;
    },
    async session({ session, token }) {
      // Expose the Google id_token to the client so it can call BPI /merch/distributor/login
      session.googleIdToken = token.googleIdToken;
      // Persist BPI JWT if it was set via update()
      if (token.bpiJwt) {
        session.bpiJwt = token.bpiJwt;
      }
      if (token.bpiAuthError) {
        session.bpiAuthError = token.bpiAuthError;
      }
      return session;
    },
  },
  pages: {
    signIn: "/",
    error: "/",
  },
});
