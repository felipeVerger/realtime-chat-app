import { getToken } from 'next-auth/jwt';
import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
    async function middleware(req) {
        const pathname = req.nextUrl.pathname;

        // Manage route protection
        const isAuth = await getToken({req});
        const isLoginPage = pathname.startsWith('/login');

        const sensitiveRoutes = ['/dashboard'];
        const isAccessingSensitiveRoute = sensitiveRoutes.some((route) => pathname.startsWith(route));

        // If the user is in the login page and he is already logged in, it redirects him to the dashboard page
        if (isLoginPage) {
            if (isAuth) {
                return NextResponse.redirect(new URL('/dashboard', req.url));
            }
            return NextResponse.next();
        }

        // Check if the user is not logged in and accessing sensitive route to redirect him to the login page
        if (!isAuth && isAccessingSensitiveRoute) {
            return NextResponse.redirect(new URL('/login', req.url));
        }

        // Check if we are in the home page to redirect to the dashboard
        if (pathname === '/') {
            return NextResponse.redirect(new URL('/dashboard', req.url));
        }
    }, {
        callbacks: {
            async authorized() {
                return true;
            }
        }
    }
)

export const config = {
    matcher: ['/', '/login', '/dashboard/:path*']
}