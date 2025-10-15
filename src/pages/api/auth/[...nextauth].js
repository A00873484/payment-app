import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import GitHubProvider from "next-auth/providers/github";

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_ID,
      clientSecret: process.env.GITHUB_SECRET,
    }),
  ],
  
  pages: {
    signIn: '/admin/signin',
    error: '/admin/error',
  },
  
  callbacks: {
    async signIn({ user, account, profile }) {
        console.log('signin')
      // Optional: Whitelist admin emails
      const allowedEmails = [
        'admin@example.com',
        'staff@example.com',
        // Add your admin emails here
      ];
      
      // If you want to restrict to specific emails, uncomment this:
      // if (!allowedEmails.includes(user.email)) {
      //   return false;
      // }
      
      return true;
    },
    
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.role = 'admin'; // Mark as admin user
      }
      return token;
    },
    
    async session({ session, token }) {
        console.log('session')
      if (token) {
        session.user.id = token.id;
        session.user.email = token.email;
        session.user.name = token.name;
        session.user.role = token.role;
      }
      return session;
    },
    
    async redirect({ url, baseUrl }) {
      // After login, redirect to admin dashboard
      console.log("redirect");
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      else if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    }
  },
  
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  
  secret: process.env.NEXTAUTH_SECRET,
};

export default NextAuth(authOptions);