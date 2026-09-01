package com.codet.lens.vis.core.query;

import com.jfinal.kit.StrKit;

/**
 * 模板模板使用可调用此类中方法
 * sql模板中: #(kit.[method])
 */
public class SqlTplKit {

    public static String getObjName() {
        return "kit";
    }

    public boolean isBlank(String str) {
        return StrKit.isBlank(str);
    }

    public boolean notBlank(String str) {
        return StrKit.notBlank(str);
    }
}
