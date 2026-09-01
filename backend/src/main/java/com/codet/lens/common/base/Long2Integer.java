package com.codet.lens.common.base;

import tools.jackson.core.JacksonException;
import tools.jackson.core.JsonGenerator;
import tools.jackson.databind.SerializationContext;
import tools.jackson.databind.ValueSerializer;

/** 全局 Long 会序列化成字符串，分页等数值字段用此注解保持数字。 */
public class Long2Integer extends ValueSerializer<Long> {
    @Override
    public void serialize(Long value, JsonGenerator gen, SerializationContext ctxt) throws JacksonException {
        if (value == null) {
            gen.writeNull();
            return;
        }
        gen.writeNumber(value.intValue());
    }
}
