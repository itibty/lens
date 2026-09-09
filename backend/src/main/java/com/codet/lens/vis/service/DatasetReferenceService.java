package com.codet.lens.vis.service;

import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.codet.lens.common.base.ListResponse;
import com.codet.lens.common.base.ResultException;
import com.codet.lens.common.base.Status;
import com.codet.lens.vis.core.dash.VisDashDatasetRefs;
import com.codet.lens.vis.dto.dataset.DatasetDashboardRefInfo;
import com.codet.lens.vis.dto.dataset.DatasetDashboardRefInfo.Reference;
import com.codet.lens.vis.entity.VisCard;
import com.codet.lens.vis.entity.VisDashboard;
import com.codet.lens.vis.entity.VisDashboardCard;
import com.codet.lens.vis.entity.VisDataset;
import com.codet.lens.vis.entity.VisDashGroup;
import com.codet.lens.vis.mapper.VisCardMapper;
import com.codet.lens.vis.mapper.VisDashboardCardMapper;
import com.codet.lens.vis.mapper.VisDashboardMapper;
import com.codet.lens.vis.mapper.VisDatasetMapper;
import com.codet.lens.vis.mapper.VisDashGroupMapper;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class DatasetReferenceService {
    private static final int DASHBOARD_BATCH_SIZE = 200;

    private final VisDatasetMapper datasetMapper;
    private final VisCardMapper cardMapper;
    private final VisDashboardMapper dashboardMapper;
    private final VisDashboardCardMapper dashboardCardMapper;
    private final VisDashGroupMapper groupMapper;

    public ListResponse<DatasetDashboardRefInfo> listDashboards(Long datasetId) {
        VisDataset dataset = datasetMapper.selectById(datasetId);
        if (dataset == null || Status.DEL.equals(dataset.getStatus())) {
            throw ResultException.fail("数据集不存在");
        }
        return new ListResponse<>(findDashboards(Set.of(datasetId)));
    }

    public void assertNoDashboardReferences(List<Long> datasetIds) {
        List<DatasetDashboardRefInfo> refs = findDashboards(Set.copyOf(datasetIds));
        if (!refs.isEmpty()) {
            String names = refs.stream().limit(5).map(DatasetDashboardRefInfo::getDashName)
                    .collect(Collectors.joining("、"));
            throw ResultException.fail("数据集被 " + refs.size() + " 个看板引用，请先处理看板："
                    + names + (refs.size() > 5 ? " 等" : ""));
        }
    }

    private List<DatasetDashboardRefInfo> findDashboards(Set<Long> datasetIds) {
        if (datasetIds.isEmpty()) {
            return List.of();
        }
        Map<Long, List<Reference>> cardRefs = findCardReferences(datasetIds);
        List<DatasetDashboardRefInfo> result = new ArrayList<>();
        Long afterId = null;
        // 过滤器没有独立引用索引，按 ID 分批扫描，避免一次载入全部看板配置。
        while (true) {
            List<VisDashboard> batch = dashboardMapper.selectList(Wrappers.<VisDashboard>query()
                    .ne("status", Status.DEL).gt(afterId != null, "id", afterId)
                    .select("id", "dash_name", "group_id", "status", "config_json")
                    .orderByAsc("id").last("LIMIT " + DASHBOARD_BATCH_SIZE));
            if (batch.isEmpty()) {
                break;
            }
            Map<Long, Long> groupsByDashboard = new HashMap<>();
            List<DatasetDashboardRefInfo> matched = new ArrayList<>();
            for (VisDashboard dashboard : batch) {
                List<Reference> refs = new ArrayList<>(cardRefs.getOrDefault(dashboard.getId(), List.of()));
                try {
                    refs.addAll(VisDashDatasetRefs.collect(dashboard.getConfigJson(), datasetIds));
                } catch (ResultException e) {
                    log.warn("Cannot inspect dataset references for dashboard {}", dashboard.getId());
                    throw e;
                }
                if (refs.isEmpty()) {
                    continue;
                }
                DatasetDashboardRefInfo info = new DatasetDashboardRefInfo();
                info.setId(dashboard.getId());
                info.setDashName(dashboard.getDashName());
                info.setStatus(dashboard.getStatus());
                info.setReferences(refs);
                matched.add(info);
                groupsByDashboard.put(dashboard.getId(), dashboard.getGroupId());
            }
            fillGroupNames(matched, groupsByDashboard);
            result.addAll(matched);
            if (batch.size() < DASHBOARD_BATCH_SIZE) {
                break;
            }
            afterId = batch.getLast().getId();
        }
        return result;
    }

    private Map<Long, List<Reference>> findCardReferences(Set<Long> datasetIds) {
        Map<Long, String> cards = cardMapper.selectList(Wrappers.<VisCard>query()
                        .in("dataset_id", datasetIds).ne("status", Status.DEL)
                        .select("id", "card_name")).stream()
                .collect(Collectors.toMap(VisCard::getId, VisCard::getCardName));
        Map<Long, List<Reference>> refs = new HashMap<>();
        if (!cards.isEmpty()) {
            for (VisDashboardCard link : dashboardCardMapper.selectList(Wrappers.<VisDashboardCard>query()
                    .in("card_id", cards.keySet()).select("dashboard_id", "card_id"))) {
                refs.computeIfAbsent(link.getDashboardId(), ignored -> new ArrayList<>())
                        .add(new Reference("CARD", cards.get(link.getCardId())));
            }
        }
        return refs;
    }

    private void fillGroupNames(List<DatasetDashboardRefInfo> dashboards, Map<Long, Long> groupsByDashboard) {
        Set<Long> groupIds = groupsByDashboard.values().stream()
                .filter(id -> id != null && id != 0).collect(Collectors.toSet());
        Map<Long, String> groupNames = groupIds.isEmpty() ? Map.of()
                : groupMapper.selectList(Wrappers.<VisDashGroup>query().in("id", groupIds)
                .select("id", "group_name")).stream()
                .collect(Collectors.toMap(VisDashGroup::getId, VisDashGroup::getGroupName));
        for (DatasetDashboardRefInfo info : dashboards) {
            Long groupId = groupsByDashboard.get(info.getId());
            info.setGroupName(groupId == null || groupId == 0 ? "报表中心" : groupNames.get(groupId));
        }
    }
}
