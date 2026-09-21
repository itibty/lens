package com.codet.lens.vis.dto;

import com.codet.lens.common.base.BaseEntity;
import com.codet.lens.common.base.Long2DatetimeStr;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;
import tools.jackson.databind.annotation.JsonSerialize;

/** 资源的创建、更新记录；人员名称由服务批量补全。 */
@Getter
@Setter
public abstract class ResourceAuditInfo {
    @Schema(description = "创建人 id")
    private Long createBy;

    @Schema(description = "创建人姓名或账号")
    private String createByName;

    @Schema(description = "创建时间")
    @JsonSerialize(using = Long2DatetimeStr.class)
    private Long createAt;

    @Schema(description = "更新人 id")
    private Long modifyBy;

    @Schema(description = "更新人姓名或账号")
    private String modifyByName;

    @Schema(description = "更新时间")
    @JsonSerialize(using = Long2DatetimeStr.class)
    private Long modifyAt;

    public void copyAuditFrom(BaseEntity entity) {
        setCreateBy(entity.getCreateBy());
        setCreateAt(entity.getCreateAt());
        setModifyBy(entity.getModifyBy());
        setModifyAt(entity.getModifyAt());
    }
}
