package com.codet.lens.vis.dto.dataset;

import com.codet.lens.common.base.EnumValue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class DataTimeConfig {
    private boolean enabled;
    @EnumValue(strValues = {"updatedAt", "coverageEnd"})
    @NotBlank
    private String kind = "updatedAt";
    @EnumValue(strValues = {"date", "datetime"})
    @NotBlank
    private String precision = "datetime";
    @NotBlank
    private String timezone = "Asia/Shanghai";
    @Size(max = 10000)
    private String sql;
}
