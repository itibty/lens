package com.codet.lens;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.SpringApplication;

@SpringBootApplication
@MapperScan(value = "com.codet.lens", markerInterface = BaseMapper.class)
public class LensApplication {

    public static void main(String[] args) {
        SpringApplication.run(LensApplication.class, args);
    }
}
