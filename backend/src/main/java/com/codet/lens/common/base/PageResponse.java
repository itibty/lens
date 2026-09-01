package com.codet.lens.common.base;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;
import lombok.experimental.Accessors;
import lombok.Getter;
import lombok.Setter;
import tools.jackson.databind.annotation.JsonSerialize;

@Getter
@Setter
@Accessors(chain = true)
public class PageResponse<T> {
    @JsonSerialize(using = Long2Integer.class)
    @Schema(description = "当前页", requiredMode = Schema.RequiredMode.REQUIRED, type = "integer", format = "int32")
    Long pageNumber;
    @JsonSerialize(using = Long2Integer.class)
    @Schema(description = "每页大小", requiredMode = Schema.RequiredMode.REQUIRED, type = "integer", format = "int32")
    Long pageSize;
    @JsonSerialize(using = Long2Integer.class)
    @Schema(description = "总条数", requiredMode = Schema.RequiredMode.REQUIRED, type = "integer", format = "int32")
    Long total;
    @JsonSerialize(using = Long2Integer.class)
    @Schema(description = "总页数", requiredMode = Schema.RequiredMode.REQUIRED, type = "integer", format = "int32")
    Long pages;
    @Schema(description = "记录", requiredMode = Schema.RequiredMode.REQUIRED)
    List<T> records;
}
