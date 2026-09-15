package com.codet.lens.vis.dto.dash;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

public final class PersonalReportDtos {
    private PersonalReportDtos() {}

    @Getter @Setter
    public static class SavePersonalViewRequest {
        private Long id;
        @NotNull private Long dashboardId;
        @NotBlank @Size(max = 80) private String viewName;
        @NotBlank @Size(max = 32768) private String stateJson;
        private Integer revision;
    }

    @Getter @Setter
    public static class PersonalViewInfo {
        private Long id;
        private Long dashboardId;
        private String viewName;
        private String stateJson;
        private Integer revision;
    }

    @Getter @Setter
    public static class PersonalReportInfo {
        private Long dashboardId;
        private String dashboardName;
        private String description;
        private String icon;
        private Boolean favorite;
        private String lastViewedAt;
        private Long defaultViewId;
    }

    @Getter @Setter
    public static class ReportPreferenceRequest {
        @NotNull private Long dashboardId;
        private Boolean favorite;
        private Long defaultViewId;
    }

    @Getter @Setter
    public static class ResolveViewRequest {
        @NotNull private Long dashboardId;
        private Long viewId;
        @Size(max = 32768) private String stateJson;
    }

    @Getter @Setter
    public static class ResolvedView {
        private Long viewId;
        private String viewName;
        private String stateJson;
        private String summary;
        private Integer revision;
        private String asOfDate;
    }
}
