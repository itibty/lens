package com.codet.lens.vis.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.codet.lens.common.BaseEntity;
import lombok.Getter;
import lombok.Setter;
import lombok.experimental.Accessors;

@TableName("vis_dataset_field")
@Getter
@Setter
@Accessors(chain = true)
public class VisDatasetField extends BaseEntity {
    private Long datasetId;
    private String field;
    private String dataType;
    private String suggestRole;
    private Integer sortNum;
    private String status;
}
