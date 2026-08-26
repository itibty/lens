package com.codet.lens.common;

import cn.hutool.json.JSONUtil;

public final class JsonUtil {
    private JsonUtil() {
    }

    public static String toJson(Object obj) {
        return JSONUtil.toJsonStr(obj);
    }

    public static <T> T toBean(String json, Class<T> type) {
        return JSONUtil.toBean(json, type);
    }
}
