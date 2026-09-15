package com.codet.lens.vis.subscription;

import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.codet.lens.common.auth.AuthContext;
import com.codet.lens.common.base.ResultException;
import com.codet.lens.vis.dto.dash.PersonalReportDtos.ResolvedView;
import com.codet.lens.vis.entity.VisDashboardSubscriptionRun;
import com.codet.lens.vis.mapper.VisDashboardSubscriptionRunMapper;
import com.codet.lens.vis.service.DashboardViewStateService;
import com.codet.lens.vis.service.PersonalReportService;
import com.codet.lens.vis.core.query.DateValueExpResolver;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Objects;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class SubscriptionRunViewService {
    private static final ObjectMapper JSON = new ObjectMapper();
    private final VisDashboardSubscriptionRunMapper runs;
    private final PersonalReportService reports;
    private final DashboardViewStateService states;

    /** 日期基准一旦落库，重试和邮件回看都复用。 */
    public void freezeDate(VisDashboardSubscriptionRun run) {
        if (run.getViewStateJson() == null || run.getAsOfDate() != null) return;
        String date = LocalDate.now(ZoneId.of(run.getViewTimezone() == null ? "Asia/Shanghai" : run.getViewTimezone())).toString();
        runs.update(null, Wrappers.<VisDashboardSubscriptionRun>lambdaUpdate()
                .eq(VisDashboardSubscriptionRun::getId, run.getId()).isNull(VisDashboardSubscriptionRun::getAsOfDate)
                .set(VisDashboardSubscriptionRun::getAsOfDate, date));
        run.setAsOfDate(runs.selectById(run.getId()).getAsOfDate());
    }

    public ResolvedView resolve(Long runId, Long dashboardId) {
        VisDashboardSubscriptionRun run = runs.selectById(runId);
        if (run == null || !Objects.equals(run.getCreateBy(), AuthContext.getUserIdLong())
                || !Objects.equals(dashboardId, run.getDashboardId()) || run.getViewStateJson() == null
                || run.getAsOfDate() == null) throw ResultException.fail("订阅运行不存在或不可访问");
        var dashboard = reports.requireDashboard(dashboardId);
        var snapshot = states.snapshot(dashboard, run.getViewStateJson(), run.getViewBindingsJson());
        ResolvedView result = new ResolvedView();
        result.setStateJson(snapshot.stateJson());
        result.setViewName("订阅运行视图");
        result.setAsOfDate(run.getAsOfDate());
        StringBuilder summary = new StringBuilder(snapshot.summary());
        LocalDate asOfDate = LocalDate.parse(run.getAsOfDate());
        var filters = DashboardViewStateService.object(snapshot.stateJson()).path("filters");
        filters.elements().forEachRemaining(value -> {
            if (value.hasNonNull("valueExp")) {
                Object[] args = JSON.convertValue(value.path("value"), Object[].class);
                String[] range = DateValueExpResolver.resolve(value.path("valueExp").asText(), args, asOfDate);
                summary.append("（").append(range[0]).append(" ～ ").append(range[1]).append("）");
            }
        });
        result.setSummary(summary.toString());
        return result;
    }
}
