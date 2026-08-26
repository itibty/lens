package com.codet.lens.vis.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.codet.lens.common.BaseEntity;
import lombok.Getter;
import lombok.Setter;
import lombok.experimental.Accessors;

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
