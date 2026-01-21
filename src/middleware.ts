import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import type { NextRequestWithAuth } from "next-auth/middleware";

export default withAuth(
  function middleware(req: NextRequestWithAuth) {
    console.log("[middleware] running:", req.nextUrl.pathname);
    const token = req.nextauth.token;

    if (token) return NextResponse.next();

    const signInUrl = new URL('/admin/signin', req.url);
    signInUrl.searchParams.set('callbackUrl', req.url);
    return NextResponse.redirect(signInUrl);
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: [
    //'/',
    '/api((?!/public|/auth).*)',
    '/admin((?!/signin|/error).*)',
  ],
};
