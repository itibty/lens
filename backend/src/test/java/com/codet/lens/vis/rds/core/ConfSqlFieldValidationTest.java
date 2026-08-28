package com.codet.lens.vis.rds.core;

import com.codet.lens.vis.rds.dto.conf.ConfSqlContentRequest;
import com.codet.lens.vis.rds.dto.conf.ConfSqlFieldInfo;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ConfSqlFieldValidationTest {

    private final Validator validator = Validation.buildDefaultValidatorFactory().getValidator();

    @Test
    void acceptsSupportedFieldTypeAndRole() {
        ConfSqlFieldInfo field = field("amount", "NUMBER", "METRIC");

        assertTrue(validator.validate(request(field)).isEmpty());
    }

    @Test
    void rejectsUnsupportedFieldTypeAndRole() {
        ConfSqlFieldInfo field = field("amount", "NUM", "VALUE");

        assertEquals(2, validator.validate(request(field)).size());
    }

    private static ConfSqlContentRequest request(ConfSqlFieldInfo field) {
        ConfSqlContentRequest request = new ConfSqlContentRequest();
        request.setId(1L);
        request.setSqlContent("select amount");
        request.setFields(List.of(field));
        return request;
    }

    private static ConfSqlFieldInfo field(String name, String dataType, String role) {
        ConfSqlFieldInfo field = new ConfSqlFieldInfo();
        field.setField(name);
        field.setDataType(dataType);
        field.setSuggestRole(role);
        return field;
    }
}
