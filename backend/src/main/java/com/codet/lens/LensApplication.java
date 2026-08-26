package com.codet.lens;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
@MapperScan("com.codet.lens")
public class LensApplication {

    public static void main(String[] args) {
        SpringApplication.run(LensApplication.class, args);
    }
}
