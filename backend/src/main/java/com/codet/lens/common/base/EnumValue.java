package com.codet.lens.common.base;

import jakarta.validation.Constraint;
import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;
import jakarta.validation.Payload;
import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;

@Target({ElementType.FIELD, ElementType.PARAMETER})
@Retention(RetentionPolicy.RUNTIME)
@Documented
@Constraint(validatedBy = EnumValue.Validator.class)
public @interface EnumValue {
    String message() default "不是合法可选值";

    String[] strValues() default {};

    int[] intValues() default {};

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};

    class Validator implements ConstraintValidator<EnumValue, Object> {
        private Set<String> allowed;

        @Override
        public void initialize(EnumValue anno) {
            allowed = new HashSet<>(Arrays.asList(anno.strValues()));
            for (int v : anno.intValues()) {
                allowed.add(String.valueOf(v));
            }
        }

        @Override
        public boolean isValid(Object value, ConstraintValidatorContext context) {
            if (value == null || allowed.isEmpty()) {
                return true;
            }
            return allowed.contains(value.toString());
        }
    }
}
