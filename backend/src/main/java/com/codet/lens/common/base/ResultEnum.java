package com.codet.lens.common.base;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@RequiredArgsConstructor
@Getter
public enum ResultEnum {
    SUCCESS(200, "操作成功"),
    FAIL(999, "参数或系统错误"),
    ERROR401(401, "未登录"),
    ERROR403(403, "无权限"),
    ERROR404(404, "资源不存在");

    private final Integer code;
    private final String msg;
}
