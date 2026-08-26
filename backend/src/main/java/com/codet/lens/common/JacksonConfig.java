package com.codet.lens.common;

import com.fasterxml.jackson.annotation.JsonInclude;
import org.springframework.boot.jackson.autoconfigure.JsonMapperBuilderCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import tools.jackson.databind.module.SimpleModule;
import tools.jackson.databind.ser.std.ToStringSerializer;

import java.math.BigInteger;

/** 雪花 Long 序列化成字符串，避免前端精度丢失。 */
@Configuration
public class JacksonConfig {

    @Bean
    public JsonMapperBuilderCustomizer longAsStringCustomizer() {
        return builder -> {
            SimpleModule module = new SimpleModule();
            module.addSerializer(Long.TYPE, ToStringSerializer.instance);
            module.addSerializer(Long.class, ToStringSerializer.instance);
            module.addSerializer(BigInteger.class, ToStringSerializer.instance);
            builder.addModule(module);
            builder.changeDefaultPropertyInclusion(incl -> JsonInclude.Value.construct(
                    JsonInclude.Include.NON_NULL, JsonInclude.Include.NON_NULL));
        };
    }
}
