package com.codet.lens.vis.dto.query;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class QueryMeta {
    private String resultGeneratedAt;
    private Long datasetId;
    private String datasetName;
    private DataTime dataTime;

    @Getter
    @Setter
    public static class DataTime {
        private String status;
        private String kind;
        private String precision;
        private String timezone;
        private String value;
        private String checkedAt;
        private String message;
    }
}
