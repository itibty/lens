package com.codet.lens.vis.dto.datasource;

public record DatasourceImpact(String warningType, int datasetCount) {
    public DatasourceImpact(int datasetCount) {
        this("DATASOURCE_IMPACT", datasetCount);
    }
}
