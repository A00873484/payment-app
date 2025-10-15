/*import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
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
    '/',
    '/api/admin/:path*',
    '/admin((?!/signin|/error).*)',
  ],
};
*/
import { NextResponse } from "next/server";

export function middleware(req) {
  console.log("[middleware] running:", req.nextUrl.pathname);
  return NextResponse.next();
}

export const config = { matcher: ['/(.*)'] };
