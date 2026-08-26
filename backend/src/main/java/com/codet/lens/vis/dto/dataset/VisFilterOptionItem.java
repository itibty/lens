package com.codet.lens.vis.dto.dataset;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

@Schema(description = "筛选项")
@Getter
@Setter
public class VisFilterOptionItem {

    @Schema(description = "展示名", requiredMode = Schema.RequiredMode.REQUIRED)
    private String label;

    @Schema(description = "值", requiredMode = Schema.RequiredMode.REQUIRED)
    private String value;

    public static VisFilterOptionItem of(String label, String value) {
        VisFilterOptionItem item = new VisFilterOptionItem();
        item.setLabel(label);
        item.setValue(value);
        return item;
    }
}
