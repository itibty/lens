package com.codet.lens.vis.enums;

import lombok.Getter;

@Getter
public enum SortDirEnum {

    ASC("asc", "升序", "ASC"),
    DESC("desc", "降序", "DESC");

    private final String code;
    private final String name;
    private final String value;

    SortDirEnum(String code, String name, String value) {
        this.code = code;
        this.name = name;
        this.value = value;
    }
}
