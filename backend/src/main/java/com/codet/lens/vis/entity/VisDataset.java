package com.codet.lens.vis.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.codet.lens.common.base.BaseEntity;
import lombok.experimental.Accessors;
import lombok.Getter;
import lombok.Setter;

@TableName("vis_dataset")
@Getter
@Setter
@Accessors(chain = true)
public class VisDataset extends BaseEntity {
    private Long sourceId;
    private String datasetName;
    private String datasetDesc;
    private String sqlContent;
    private String paramDemo;
    private String status;
}
