package com.codet.lens.sys.service;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class AccountServiceTest {

    @Test
    void usesDefaultTtlWhenRolesHaveNoEnd() {
        assertEquals(13_000L, AccountService.resolveTokenExpiresAt(1_000L, 12_000L, null));
    }

    @Test
    void capsTokenAtEarliestRoleEnd() {
        assertEquals(5_000L, AccountService.resolveTokenExpiresAt(1_000L, 12_000L, 5_000L));
    }

    @Test
    void keepsDefaultTtlWhenRoleEndsLater() {
        assertEquals(13_000L, AccountService.resolveTokenExpiresAt(1_000L, 12_000L, 20_000L));
    }
}
