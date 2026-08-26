package com.codet.lens.auth;

import lombok.Getter;
import lombok.Setter;
import lombok.experimental.Accessors;

import java.util.HashSet;
import java.util.Set;

@Getter
@Setter
@Accessors(chain = true)
public class AuthUser {
    private String subject;
    private Set<String> roles = new HashSet<>();
    private Set<String> perms = new HashSet<>();

    public boolean isAdmin() {
        return roles.contains(com.codet.lens.common.PermCodes.ROLE_ADMIN);
    }

    public boolean hasPerm(String code) {
        return isAdmin() || perms.contains(code);
    }

    public boolean hasAnyPerm(String... codes) {
        if (isAdmin()) {
            return true;
        }
        for (String code : codes) {
            if (perms.contains(code)) {
                return true;
            }
        }
        return false;
    }
}
