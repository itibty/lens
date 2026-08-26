package com.codet.lens.vis.core.query;

import cn.hutool.core.collection.CollUtil;
import com.codet.lens.auth.AuthContext;
import com.codet.lens.common.PermCodes;
import com.codet.lens.common.ResultEnum;
import com.codet.lens.common.ResultException;
import com.codet.lens.common.WebUtil;
import com.codet.lens.vis.rds.bo.ExecSqlInfo;
import com.codet.lens.vis.rds.core.QueryContext;
import jakarta.servlet.http.HttpServletRequest;
import lombok.AccessLevel;
import lombok.NoArgsConstructor;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@NoArgsConstructor(access = AccessLevel.PRIVATE)
public final class VisExecSql {

    public static final String PARAM = "SHOW_SQL";
    public static final String QUERY_FAIL = "数据查询失败，请联系管理员";

    public static boolean showSql() {
        HttpServletRequest request = WebUtil.getServletRequest();
        if (request == null || !"true".equals(request.getParameter(PARAM))) {
            return false;
        }
        return AuthContext.get() != null && AuthContext.get().hasPerm(PermCodes.DS_SQL_CONF);
    }

    public static List<ExecSqlInfo> listOrNull(QueryContext ctx) {
        if (ctx == null || !ctx.isShowSql() || CollUtil.isEmpty(ctx.getExecSqls())) {
            return null;
        }
        return ctx.getExecSqls();
    }

    public static ResultException wrap(Exception e, QueryContext ctx) {
        Object data = failData(ctx);
        if (e instanceof ResultException re) {
            if (re.getData() == null && data != null) {
                re.setData(data);
            }
            return re;
        }
        if (ctx != null && ctx.isShowSql()) {
            String msg = e.getMessage() != null ? e.getMessage() : ResultEnum.FAIL.getMsg();
            return new ResultException(ResultEnum.FAIL.getCode(), msg, data);
        }
        return new ResultException(ResultEnum.FAIL.getCode(), QUERY_FAIL);
    }

    private static Map<String, Object> failData(QueryContext ctx) {
        List<ExecSqlInfo> sqls = listOrNull(ctx);
        if (sqls == null) {
            return null;
        }
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("execSqls", sqls);
        return data;
    }
}
