package com.codet.lens.vis.rds.core;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;
import lombok.experimental.Accessors;

import java.util.List;


public class MetaInfo {

    @Schema(description = "逻辑库")
    @Getter
    @Setter
    public static class SchemaInfo {
        @Schema(description = "信息类别", requiredMode = Schema.RequiredMode.REQUIRED)
        private String infoType = "SCHEMA";

        @Schema(description = "名字", requiredMode = Schema.RequiredMode.REQUIRED)
        private String name;

        @Schema(description = "备注")
        private String comment;

        @Schema(description = "数据库类别", requiredMode = Schema.RequiredMode.REQUIRED)
        private String dbType;

        @Schema(description = "表列表")
        private List<TableInfo> tableInfos;
    }

    @Schema(description = "表")
    @Getter
    @Setter
    public static class TableInfo {
        @Schema(description = "信息类别", requiredMode = Schema.RequiredMode.REQUIRED)
        private String infoType = "TABLE";

        @Schema(description = "表名", requiredMode = Schema.RequiredMode.REQUIRED)
        private String name;

        @Schema(description = "备注")
        private String comment;

        @Schema(description = "表字段")
        private List<FieldInfo> fieldInfos;

        @Schema(description = "表索引")
        private List<IndexInfo> indexInfos;
    }

    @Schema(description = "表字段索引")
    @Getter
    @Setter
    @Accessors(chain = true)
    public static class IndexInfo {

        @Schema(description = "信息类别", requiredMode = Schema.RequiredMode.REQUIRED)
        private String infoType = "INDEX";

        @Schema(description = "索引名", requiredMode = Schema.RequiredMode.REQUIRED)
        private String name;

        @Schema(description = "是否是唯一索引", requiredMode = Schema.RequiredMode.REQUIRED)
        private Boolean isUnique;

        @Schema(description = "字段列描述", requiredMode = Schema.RequiredMode.REQUIRED)
        private String fieldDesc;
    }

    @Schema(description = "表字段")
    @Getter
    @Setter
    @Accessors(chain = true)
    public static class FieldInfo {
        @Schema(description = "信息类别", requiredMode = Schema.RequiredMode.REQUIRED)
        private String infoType = "FIELD";

        @Schema(description = "字段名", requiredMode = Schema.RequiredMode.REQUIRED)
        private String name;

        @Schema(description = "备注")
        private String comment;

        @Schema(description = "字段类型", requiredMode = Schema.RequiredMode.REQUIRED)
        private String type;

        @Schema(description = "字段描述类型", requiredMode = Schema.RequiredMode.REQUIRED)
        private String typeDesc;

        @Schema(description = "是否主键", requiredMode = Schema.RequiredMode.REQUIRED)
        private Boolean isPk;

        @Schema(description = "是否可为空", requiredMode = Schema.RequiredMode.REQUIRED)
        private Boolean nullable;

        @Schema(description = "默认值")
        private String defaultValue;

        @Schema(description = "是否自增")
        private Boolean isAutoIncrement;
    }
}
