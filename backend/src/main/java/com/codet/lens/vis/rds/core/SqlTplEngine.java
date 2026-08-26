package com.codet.lens.vis.rds.core;

import com.jfinal.plugin.activerecord.SqlPara;
import com.jfinal.plugin.activerecord.sql.ParaDirective;
import com.jfinal.template.Engine;
import com.jfinal.template.Template;

import java.util.HashMap;
import java.util.Map;

/**
 * Sql模板引擎, 线程安全
 * 参考JFinal Enjoy  SqlKit.java 代码
 */
public class SqlTplEngine {
    private final Engine engine;

    public SqlTplEngine(String engineName) {
        engine = new Engine(engineName);
        engine.setCompressorOn(' '); // sql压缩
        engine.setToClassPathSourceFactory();
        // engine.setDatePattern("yyyy-MM-dd HH:mm:ss"); #date() 指令使用

        engine.addDirective("para", ParaDirective.class, true);
        engine.removeDirective("call");
        engine.removeDirective("random");
        engine.removeDirective("number");
        engine.removeDirective("render");
        engine.removeDirective("date");
        engine.removeDirective("string");
        engine.removeDirective("escape");

        // 分享方法、分享对象 根据用户过滤数据
        // https://jfinal.com/doc/6-8, sql模板中直接调用 #(kit.[method])
        engine.addSharedObject(SqlTplKit.getObjName(), new SqlTplKit());
        // com.jfinal.template.ext.sharedmethod.SharedMethodLib 已配置  Shared Method
    }

    static final String SQL_PARA_KEY = "_SQL_PARA_";
    static final String PARA_ARRAY_KEY = "_PARA_ARRAY_";

    protected SqlPara getSqlPara(String sqlTpl, Map<String, Object> data) {
        Template template = engine.getTemplateByString(sqlTpl);
        SqlPara sqlPara = new SqlPara();
        data.put(SQL_PARA_KEY, sqlPara);
        sqlPara.setSql(template.renderToString(data));
        data.remove(SQL_PARA_KEY);
        return sqlPara;
    }

    protected SqlPara getSqlPara(String sqlTpl, Object... paras) {
        Template template = engine.getTemplateByString(sqlTpl);
        SqlPara sqlPara = new SqlPara();
        Map<String, Object> data = new HashMap<>();
        data.put(SQL_PARA_KEY, sqlPara);
        data.put(PARA_ARRAY_KEY, paras);
        sqlPara.setSql(template.renderToString(data));
        return sqlPara;
    }

    protected Engine getEngine() {
        return engine;
    }
}
