package com.codet.lens.vis.dto.dataset;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Schema(description = "数据集关联看板")
public class DatasetDashboardRefInfo {
    private Long id;
    private String dashName;
    private String groupName;
    private String status;
    private List<Reference> references;

    @Getter
    @Setter
    @Schema(name = "DatasetDashboardReference", description = "看板引用来源")
    public static class Reference {
        @Schema(allowableValues = {"CARD", "FILTER", "OPTIONS"})
        private String type;
        private String name;

        public Reference(String type, String name) {
            this.type = type;
            this.name = name;
        }
    }
}
