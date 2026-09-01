package com.codet.lens.common.base;

import cn.hutool.core.date.DateUtil;
import java.util.Date;
import tools.jackson.core.JacksonException;
import tools.jackson.core.JsonGenerator;
import tools.jackson.databind.SerializationContext;
import tools.jackson.databind.ValueSerializer;

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
