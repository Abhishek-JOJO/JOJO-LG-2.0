import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const protectedRoutes = ['/profile', '/account-settings'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Read auth cookie
  // The backend API or your login handler MUST set this cookie on successful login
  const token = request.cookies.get('jojo_auth_token')?.value;
  const isGuest = request.cookies.get('jojo_is_guest')?.value === 'true';
  const hasProfile = request.cookies.get('jojo_has_profile')?.value === 'true';

  // 2. Protect /register/create-account: prohibit guest or unauthenticated access directly,
  // and prohibit access for logged-in users who already created a profile.
  if (pathname.startsWith('/register/create-account')) {
    if (!token || isGuest) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    if (hasProfile) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    return NextResponse.next();
  }

  // 3. Protect private routes
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));

  if (isProtectedRoute && (!token || isGuest)) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 3. Prevent logged-in users from accessing login/register pages
  // IMPORTANT: Only block the root /login and /register pages, NOT sub-routes like
  // /register/create-account (profile creation for new users) or /register/otp.
  // Those sub-routes are valid post-auth destinations that new users MUST access.
  const AUTH_ROUTE_EXACT_BLOCKS = ['/login', '/register'];
  const isAuthRoute = AUTH_ROUTE_EXACT_BLOCKS.some(route => pathname === route || pathname.startsWith(`${route}/otp`)) &&
    !pathname.startsWith('/register/create-account');
  if (isAuthRoute && token && !isGuest) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

// 4. Matcher configuration: ONLY run middleware on these paths, ignore images, CSS, JS
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, images, logos, lottie (public files)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|images|logos|lottie).*)',
  ],
};
