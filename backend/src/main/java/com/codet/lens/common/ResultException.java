package com.codet.lens.common;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ResultException extends RuntimeException {
    private final Integer code;
    private final String msg;
    private Object data;

    public ResultException(Integer code, String msg) {
        this(code, msg, null);
    }

    public ResultException(Integer code, String msg, Object data) {
        super(msg);
        this.code = code;
        this.msg = msg;
        this.data = data;
    }

    public static ResultException fail(String msg) {
        return new ResultException(ResultEnum.FAIL.getCode(), msg);
    }
}
