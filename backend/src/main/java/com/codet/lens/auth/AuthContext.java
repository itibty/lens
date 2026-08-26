package com.codet.lens.auth;

public final class AuthContext {
    private static final ThreadLocal<AuthUser> HOLDER = new ThreadLocal<>();
    private static final ThreadLocal<String> TOKEN_HOLDER = new ThreadLocal<>();

    private AuthContext() {
    }

    public static void set(AuthUser user) {
        HOLDER.set(user);
    }

    public static void setToken(String token) {
        TOKEN_HOLDER.set(token);
    }

    public static AuthUser get() {
        return HOLDER.get();
    }

    public static String getUserId() {
        AuthUser u = HOLDER.get();
        return u == null ? null : u.getSubject();
    }

    public static Long getUserIdLong() {
        String id = getUserId();
        return id == null ? null : Long.valueOf(id);
    }

    public static String getToken() {
        return TOKEN_HOLDER.get();
    }

    public static void clear() {
        HOLDER.remove();
        TOKEN_HOLDER.remove();
    }
}
