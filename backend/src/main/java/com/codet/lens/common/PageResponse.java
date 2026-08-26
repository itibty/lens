package com.codet.lens.common;

import tools.jackson.databind.annotation.JsonSerialize;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;
import lombok.experimental.Accessors;

import java.util.List;

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
    @Schema(description = "记录")
    List<T> records;
}
