package com.codet.lens.common;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

@Schema(description = "通用响应")
@Getter
@Setter
@ToString
@NoArgsConstructor
public class R<T> {
    @Schema(description = "200成功")
    private Integer code;
    private String msg;
    private T data;

    public R(Integer code, String msg, T data) {
        this.code = code;
        this.msg = msg;
        this.data = data;
    }

    public static <T> R<T> success(T data) {
        return new R<>(ResultEnum.SUCCESS.getCode(), ResultEnum.SUCCESS.getMsg(), data);
    }

    public static <T> R<T> success() {
        return success(null);
    }

    public static <T> R<T> success(String msg, T data) {
        return new R<>(ResultEnum.SUCCESS.getCode(), msg, data);
    }

    public static <T> R<T> fail(String msg) {
        return new R<>(ResultEnum.FAIL.getCode(), msg, null);
    }

    public static <T> R<T> fail(Integer code, String msg) {
        return new R<>(code, msg, null);
    }

    public static <T> R<T> fail(Integer code, String msg, T data) {
        return new R<>(code, msg, data);
    }
}
