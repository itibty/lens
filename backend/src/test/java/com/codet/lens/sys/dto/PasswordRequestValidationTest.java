package com.codet.lens.sys.dto;

import com.codet.lens.sys.dto.auth.ModifyPwdRequest;
import com.codet.lens.sys.dto.user.ResetPwdRequest;
import com.codet.lens.sys.dto.user.SaveUserRequest;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class PasswordRequestValidationTest {

    private final Validator validator = Validation.buildDefaultValidatorFactory().getValidator();

    @Test
    void modifyPasswordRequiresEightToTwentyWordCharacters() {
        ModifyPwdRequest request = new ModifyPwdRequest();
        request.setOldPassword("old-password");
        request.setNewPassword("bad-pwd!");

        assertFalse(validator.validate(request).isEmpty());

        request.setNewPassword("Good_123");
        assertTrue(validator.validate(request).isEmpty());
    }

    @Test
    void resetPasswordUsesTheSameRule() {
        ResetPwdRequest request = new ResetPwdRequest();
        request.setUserId(1L);
        request.setPassword("short");

        assertFalse(validator.validate(request).isEmpty());

        request.setPassword("Good_123");
        assertTrue(validator.validate(request).isEmpty());
    }

    @Test
    void optionalSavePasswordIsValidatedOnlyWhenPresent() {
        SaveUserRequest request = new SaveUserRequest();
        request.setUsername("user");
        request.setRealName("User");

        assertTrue(validator.validate(request).isEmpty());

        request.setPassword("bad!");
        assertFalse(validator.validate(request).isEmpty());
    }
}
