package com.codet.lens.common;

import cn.hutool.core.date.DateUtil;
import tools.jackson.core.JacksonException;
import tools.jackson.core.JsonGenerator;
import tools.jackson.databind.SerializationContext;
import tools.jackson.databind.ValueSerializer;

import java.util.Date;

public class Long2DatetimeStr extends ValueSerializer<Long> {
    @Override
    public void serialize(Long value, JsonGenerator gen, SerializationContext ctxt) throws JacksonException {
        if (value == null) {
            gen.writeNull();
            return;
        }
        gen.writeString(DateUtil.formatDateTime(new Date(value)));
    }
}
