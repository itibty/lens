package com.codet.lens.vis.subscription;

import com.codet.lens.common.base.ResultEnum;
import com.codet.lens.common.base.ResultException;

/** 只有明确的账号、邮箱、权限或看板失效才自动停用订阅。 */
public class DashboardSubscriptionUnavailableException extends ResultException {
    public DashboardSubscriptionUnavailableException(String message) {
        super(ResultEnum.FAIL.getCode(), message);
    }
}
